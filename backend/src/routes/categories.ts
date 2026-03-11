import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";

/**
 * Category listing routes with tree structure support.
 */
export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request: FastifyRequest) => {
    const { type } = request.query as { type?: string };
    const where: any = { parentId: null };
    if (type) where.type = type;

    const categories = await prisma.category.findMany({
      where,
      include: { children: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: categories };
  });

  app.get("/:id", async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        children: true,
        parent: true,
      },
    });

    return { success: true, data: category };
  });
}
