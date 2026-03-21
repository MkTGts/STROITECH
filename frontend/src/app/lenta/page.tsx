import { Suspense } from "react";
import { LentaPageClient } from "./lenta-client";

export default function LentaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Загрузка ленты…
        </div>
      }
    >
      <LentaPageClient />
    </Suspense>
  );
}
