import { Suspense } from "react";
import { ObjectsPageClient } from "./objects-client";

export default function ObjectsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Загрузка объектов...</div>}>
      <ObjectsPageClient />
    </Suspense>
  );
}
