"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type MarkdownBodyProps = {
  markdown: string;
  className?: string;
};

/**
 * Markdown → HTML with rehype-sanitize (XSS-safe). Use for user-authored article body only.
 */
export function MarkdownBody({ markdown, className }: MarkdownBodyProps) {
  return (
    <div
      className={
        className ??
        "feed-markdown max-w-none space-y-4 text-[15px] leading-relaxed text-foreground [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h1]:scroll-mt-20 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:scroll-mt-20 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6"
      }
    >
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{markdown}</ReactMarkdown>
    </div>
  );
}
