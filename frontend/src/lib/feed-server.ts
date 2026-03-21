import { cache } from "react";

const SITE_NAME = "Объекты.online";
const LENTA_FALLBACK_DESCRIPTION = "Статьи и материалы от участников платформы.";

export type FeedPostMetadataResult =
  | { status: "ok"; title: string; excerpt: string | null }
  | { status: "not_found" }
  | { status: "error" };

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveBackendBaseUrl(): string {
  const internal = process.env.INTERNAL_BACKEND_URL;
  if (internal) return stripTrailingSlashes(internal);

  const backend = process.env.BACKEND_URL;
  const frontend = process.env.FRONTEND_URL;

  if (backend && frontend && stripTrailingSlashes(backend) === stripTrailingSlashes(frontend)) {
    return "http://127.0.0.1:4000";
  }

  return stripTrailingSlashes(backend || "http://127.0.0.1:4000");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFeedPostId(id: string): boolean {
  return UUID_RE.test(id);
}

async function fetchFeedPostMetadataOnce(id: string): Promise<FeedPostMetadataResult> {
  if (!isFeedPostId(id)) return { status: "not_found" };

  const url = `${resolveBackendBaseUrl()}/api/feed/posts/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const json = (await res.json()) as {
      success?: boolean;
      data?: { title?: string; excerpt?: string | null };
    };
    if (!json?.success || !json.data?.title) return { status: "error" };
    return {
      status: "ok",
      title: json.data.title,
      excerpt: json.data.excerpt ?? null,
    };
  } catch {
    return { status: "error" };
  }
}

/** Один запрос на рендер страницы (общий для generateMetadata и page). */
export const getFeedPostMetadata = cache(fetchFeedPostMetadataOnce);

export function buildArticleMetadata(result: FeedPostMetadataResult): {
  title: string;
  description: string;
} {
  if (result.status === "ok") {
    const description =
      result.excerpt?.trim() ||
      `${result.title}. Материал в ленте ${SITE_NAME}.`;
    return {
      title: `${result.title} — ${SITE_NAME}`,
      description,
    };
  }
  if (result.status === "not_found") {
    return {
      title: `Статья не найдена — ${SITE_NAME}`,
      description: LENTA_FALLBACK_DESCRIPTION,
    };
  }
  return {
    title: `Лента — ${SITE_NAME}`,
    description: LENTA_FALLBACK_DESCRIPTION,
  };
}
