import { Suspense } from "react";
import { ListingsPageClient } from "./listings-client";

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Загрузка объявлений...</div>}>
      <ListingsPageClient />
    </Suspense>
  );
}

