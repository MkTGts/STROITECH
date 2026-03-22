import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
      <head>
        <Script id="yandex-metrika" strategy="beforeInteractive">
          {`
(function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108127052', 'ym');

    ym(108127052, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108127052"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
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
