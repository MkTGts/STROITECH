import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Новая статья",
  description: "Публикация материала в ленте Объекты.online.",
};

export default function LentaNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
