import type { CommunityMemberRole } from "@prisma/client";
import { prisma } from "./prisma";

export async function getCommunityMembership(
  userId: string,
  communityId: string,
): Promise<{ role: CommunityMemberRole } | null> {
  const m = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  });
  return m;
}

export function isCommunityStaffRole(role: CommunityMemberRole): boolean {
  return role === "admin" || role === "moderator";
}

/** Глобальный moderator или админ/модератор сообщества. */
export async function canModerateCommunityContent(
  userId: string,
  globalRole: string,
  communityId: string | null,
): Promise<boolean> {
  if (globalRole === "moderator") return true;
  if (!communityId) return false;
  const m = await getCommunityMembership(userId, communityId);
  return m ? isCommunityStaffRole(m.role) : false;
}

export async function assertCommunityMember(
  userId: string,
  communityId: string,
): Promise<{ role: CommunityMemberRole } | null> {
  return getCommunityMembership(userId, communityId);
}
