import { Suspense } from "react";
import { ChatPageClient } from "./chat-client";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Загрузка чата...</div>}>
      <ChatPageClient />
    </Suspense>
  );
}

