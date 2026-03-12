import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBase = resolveBackendBaseUrl().replace(/\/+$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${backendBase}/ws`,
      },
    ];
  },
};

export default nextConfig;

function resolveBackendBaseUrl(): string {
  const internal = process.env.INTERNAL_BACKEND_URL;
  if (internal) return internal;

  const backend = process.env.BACKEND_URL;
  const frontend = process.env.FRONTEND_URL;

  // In single-container deployments, BACKEND_URL is often set equal to FRONTEND_URL.
  // For Next.js rewrites, that would loop back into the same Next server.
  // Prefer the internal Fastify listener in that case.
  if (backend && frontend && stripTrailingSlashes(backend) === stripTrailingSlashes(frontend)) {
    return "http://127.0.0.1:4000";
  }

  return backend || "http://127.0.0.1:4000";
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}
