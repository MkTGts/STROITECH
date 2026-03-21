import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildArticleMetadata, getFeedPostMetadata, isFeedPostId } from "@/lib/feed-server";
import { LentaPostClient } from "./lenta-post-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getFeedPostMetadata(id);
  const { title, description } = buildArticleMetadata(result);
  /** §5.4 BLOG: опубликованные статьи без noindex */
  const robots =
    result.status === "ok" ? { index: true as const, follow: true as const } : { index: false, follow: false };
  return { title, description, robots };
}

export default async function LentaPostPage({ params }: PageProps) {
  const { id } = await params;
  if (!isFeedPostId(id)) notFound();

  const meta = await getFeedPostMetadata(id);
  if (meta.status === "not_found") notFound();

  return <LentaPostClient id={id} />;
}
