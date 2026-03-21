import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Лента",
  description: "Статьи и материалы от участников платформы Объекты.online.",
};

export default function LentaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
