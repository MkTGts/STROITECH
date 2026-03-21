import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Редактирование статьи",
  description: "Изменение материала в ленте Объекты.online.",
};

export default function LentaEditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
