import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { EventRsvpStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getOptionalUserId, getOptionalUserRole, getUserId, getUserRole } from "../lib/auth";
import { assertCommunityMember, canModerateCommunityContent } from "../lib/community-permissions";
import { sendToUser } from "../ws/handler";

const listQuerySchema = z.object({
  when: z.enum(["upcoming", "past"]).default("upcoming"),
  communityId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(16000).optional().nullable(),
  startsAt: z.string().datetime(),
  isOnline: z.boolean().optional(),
  venue: z.string().max(500).optional().nullable(),
  communityId: z.string().uuid().optional().nullable(),
});

const updateEventSchema = createEventSchema.partial();

const rsvpBodySchema = z.object({
  status: z.enum(["going", "maybe", "not_going"]),
});

const attendeeSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  isOnline: boolean;
  venue: string | null;
  creatorId: string;
  communityId: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator: { id: string; name: string; avatarUrl: string | null };
  community: { id: string; title: string } | null;
};

function serializeEvent(r: EventRow) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.startsAt.toISOString(),
    isOnline: r.isOnline,
    venue: r.venue,
    creatorId: r.creatorId,
    communityId: r.communityId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    creator: r.creator,
    community: r.community,
  };
}

const RSVP_LABELS: Record<EventRsvpStatus, string> = {
  going: "иду",
  maybe: "возможно",
  not_going: "не иду",
};

async function canManageEvent(
  userId: string,
  globalRole: string,
  event: { creatorId: string; communityId: string | null },
): Promise<boolean> {
  if (globalRole === "moderator") return true;
  if (event.creatorId === userId) return true;
  if (event.communityId) {
    return canModerateCommunityContent(userId, globalRole, event.communityId);
  }
  return false;
}

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  /** Cron: напоминания за ~сутки до начала для RSVP «иду». Заголовок X-Cron-Secret или env EVENT_REMINDER_CRON_SECRET пустой → маршрут отключён. */
  app.post("/reminders/dispatch", async (request: FastifyRequest, reply: FastifyReply) => {
    const cronSecret = process.env.EVENT_REMINDER_CRON_SECRET;
    if (!cronSecret) {
      return reply.status(503).send({ success: false, message: "Reminders not configured" });
    }
    const header = request.headers["x-cron-secret"];
    if (header !== cronSecret) {
      return reply.status(403).send({ success: false, message: "Forbidden" });
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await prisma.eventRsvp.findMany({
      where: {
        status: "going",
        reminderNotifiedAt: null,
        event: { startsAt: { gt: now, lte: horizon } },
      },
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        user: { select: { id: true, name: true } },
      },
    });

    let sent = 0;
    for (const row of candidates) {
      const content = `Напоминание: «${row.event.title}» — ${row.event.startsAt.toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const notif = await prisma.notification.create({
        data: {
          userId: row.userId,
          type: "event_reminder",
          content,
          metadata: { eventId: row.event.id },
        },
      });
      sendToUser(row.userId, { type: "notification", payload: notif });
      await prisma.eventRsvp.update({
        where: { id: row.id },
        data: { reminderNotifiedAt: new Date() },
      });
      sent += 1;
    }

    return { success: true, data: { dispatched: sent } };
  });

  app.get("/", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const q = listQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const now = new Date();

    const where: {
      communityId?: string;
      startsAt?: { gte?: Date; lt?: Date };
    } = {};
    if (q.communityId) where.communityId = q.communityId;
    if (q.when === "upcoming") {
      where.startsAt = { gte: now };
    } else {
      where.startsAt = { lt: now };
    }

    const [rows, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: q.when === "upcoming" ? { startsAt: "asc" } : { startsAt: "desc" },
        include: {
          creator: { select: attendeeSelect },
          community: { select: { id: true, title: true } },
          _count: { select: { rsvps: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const viewerId = getOptionalUserId(request);
    let myRsvps: Map<string, EventRsvpStatus> = new Map();
    if (viewerId && rows.length > 0) {
      const mine = await prisma.eventRsvp.findMany({
        where: {
          userId: viewerId,
          eventId: { in: rows.map((r) => r.id) },
        },
        select: { eventId: true, status: true },
      });
      myRsvps = new Map(mine.map((m) => [m.eventId, m.status]));
    }

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          ...serializeEvent({
            id: r.id,
            title: r.title,
            description: r.description,
            startsAt: r.startsAt,
            isOnline: r.isOnline,
            venue: r.venue,
            creatorId: r.creatorId,
            communityId: r.communityId,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            creator: r.creator,
            community: r.community,
          }),
          attendeeCount: r._count.rsvps,
          myRsvp: viewerId ? (myRsvps.get(r.id) ?? null) : null,
        })),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = createEventSchema.parse(request.body);
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return reply.status(400).send({ success: false, message: "startsAt: некорректная дата" });
    }
    const communityId =
      body.communityId === undefined || body.communityId === null ? null : body.communityId;
    if (communityId) {
      const m = await assertCommunityMember(userId, communityId);
      if (!m) {
        return reply.status(403).send({ success: false, message: "Нужно состоять в сообществе" });
      }
    }

    const description =
      body.description === undefined || body.description === null
        ? null
        : String(body.description).trim() || null;
    const venue =
      body.venue === undefined || body.venue === null ? null : String(body.venue).trim() || null;

    const event = await prisma.event.create({
      data: {
        title: body.title.trim(),
        description,
        startsAt,
        isOnline: body.isOnline ?? false,
        venue,
        creatorId: userId,
        communityId,
      },
      include: {
        creator: { select: attendeeSelect },
        community: { select: { id: true, title: true } },
      },
    });

    return { success: true, data: serializeEvent(event) };
  });

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: { select: attendeeSelect },
        community: { select: { id: true, title: true } },
      },
    });
    if (!event) {
      return reply.status(404).send({ success: false, message: "Событие не найдено" });
    }

    const [rsvps, counts] = await Promise.all([
      prisma.eventRsvp.findMany({
        where: { eventId: id },
        select: {
          status: true,
          user: { select: attendeeSelect },
        },
      }),
      prisma.eventRsvp.groupBy({
        by: ["status"],
        where: { eventId: id },
        _count: { _all: true },
      }),
    ]);

    const countMap: Record<string, number> = { going: 0, maybe: 0, not_going: 0 };
    for (const c of counts) {
      countMap[c.status] = c._count._all;
    }

    const attendees = {
      going: [] as { id: string; name: string; avatarUrl: string | null }[],
      maybe: [] as { id: string; name: string; avatarUrl: string | null }[],
      notGoing: [] as { id: string; name: string; avatarUrl: string | null }[],
    };
    for (const r of rsvps) {
      const u = r.user;
      if (r.status === "going") attendees.going.push(u);
      else if (r.status === "maybe") attendees.maybe.push(u);
      else attendees.notGoing.push(u);
    }

    const viewerId = getOptionalUserId(request);
    const viewerRole = getOptionalUserRole(request);
    let myRsvp: EventRsvpStatus | null = null;
    if (viewerId) {
      const mine = await prisma.eventRsvp.findUnique({
        where: { eventId_userId: { eventId: id, userId: viewerId } },
        select: { status: true },
      });
      myRsvp = mine?.status ?? null;
    }

    const canManage =
      viewerId && viewerRole
        ? await canManageEvent(viewerId, viewerRole, {
            creatorId: event.creatorId,
            communityId: event.communityId,
          })
        : false;

    return {
      success: true,
      data: {
        ...serializeEvent(event),
        counts: {
          going: countMap.going,
          maybe: countMap.maybe,
          notGoing: countMap.not_going,
        },
        attendees,
        myRsvp,
        canManage,
      },
    };
  });

  app.put("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = getUserId(request);
    const role = getUserRole(request);

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { creatorId: true, communityId: true },
    });
    if (!existing) {
      return reply.status(404).send({ success: false, message: "Событие не найдено" });
    }
    if (!(await canManageEvent(userId, role, existing))) {
      return reply.status(403).send({ success: false, message: "Нет прав на изменение" });
    }

    const body = updateEventSchema.parse(request.body);
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) {
      data.description =
        body.description === null ? null : String(body.description).trim() || null;
    }
    if (body.startsAt !== undefined) {
      const d = new Date(body.startsAt);
      if (Number.isNaN(d.getTime())) {
        return reply.status(400).send({ success: false, message: "startsAt: некорректная дата" });
      }
      data.startsAt = d;
    }
    if (body.isOnline !== undefined) data.isOnline = body.isOnline;
    if (body.venue !== undefined) {
      data.venue = body.venue === null ? null : String(body.venue).trim() || null;
    }
    if (body.communityId !== undefined) {
      const next =
        body.communityId === null || body.communityId === undefined ? null : body.communityId;
      if (next) {
        const m = await assertCommunityMember(userId, next);
        if (!m) {
          return reply.status(403).send({ success: false, message: "Нужно состоять в сообществе" });
        }
      }
      data.communityId = next;
    }

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ success: false, message: "Нет полей для обновления" });
    }

    if (data.startsAt !== undefined) {
      await prisma.eventRsvp.updateMany({
        where: { eventId: id },
        data: { reminderNotifiedAt: null },
      });
    }

    const event = await prisma.event.update({
      where: { id },
      data,
      include: {
        creator: { select: attendeeSelect },
        community: { select: { id: true, title: true } },
      },
    });

    return { success: true, data: serializeEvent(event) };
  });

  app.delete("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = getUserId(request);
    const role = getUserRole(request);

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { creatorId: true, communityId: true },
    });
    if (!existing) {
      return reply.status(404).send({ success: false, message: "Событие не найдено" });
    }
    if (!(await canManageEvent(userId, role, existing))) {
      return reply.status(403).send({ success: false, message: "Нет прав на удаление" });
    }

    await prisma.event.delete({ where: { id } });
    return { success: true, data: null };
  });

  app.post("/:id/rsvp", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = getUserId(request);
    const body = rsvpBodySchema.parse(request.body);
    const status = body.status as EventRsvpStatus;

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, creatorId: true, communityId: true },
    });
    if (!event) {
      return reply.status(404).send({ success: false, message: "Событие не найдено" });
    }

    if (event.communityId && getUserRole(request) !== "moderator") {
      const m = await assertCommunityMember(userId, event.communityId);
      if (!m) {
        return reply.status(403).send({ success: false, message: "Вступите в сообщество, чтобы отметиться" });
      }
    }

    const prev = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
      select: { status: true },
    });

    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      create: { eventId: id, userId, status },
      update: { status },
    });

    const notifyRsvp = status !== "not_going" && userId !== event.creatorId;
    const statusChanged = !prev || prev.status !== status;
    if (notifyRsvp && statusChanged) {
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const label = RSVP_LABELS[status];
      const content = `${actor?.name ?? "Участник"} ответил на «${event.title}»: ${label}`;
      const notif = await prisma.notification.create({
        data: {
          userId: event.creatorId,
          type: "event_rsvp",
          content,
          metadata: { eventId: event.id, fromUserId: userId, status },
        },
      });
      sendToUser(event.creatorId, { type: "notification", payload: notif });
    }

    return { success: true, data: { status: rsvp.status, updatedAt: rsvp.updatedAt.toISOString() } };
  });
}
