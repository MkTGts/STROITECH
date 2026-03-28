import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EventsPageClient } from "./events-page-client";

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <EventsPageClient />
    </Suspense>
  );
}
