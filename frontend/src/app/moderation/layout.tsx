import { ModerationSubnav } from "@/components/features/moderation-subnav";

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[50vh] bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <ModerationSubnav />
        </div>
      </div>
      {children}
    </div>
  );
}
