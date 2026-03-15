import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/layout/auth-provider";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Объекты.online — Онлайн-сервис для строительства",
  description:
    "Доска объявлений с умным чатом и встроенным сервисом по управлению объектами. Находите строителей, поставщиков и технику по лучшим ценам.",
  keywords: ["строительство", "стройматериалы", "строители", "техника", "подрядчики", "объекты"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CookieConsent />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
