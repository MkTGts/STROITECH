import { TagFeedClient } from "./tag-feed-client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LentaTagPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "");
  return <TagFeedClient slug={slug} />;
}
