import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  /** Для LCP в шапке */
  priority?: boolean;
};

/**
 * Фирменный знак из `public/logo.png`. Высота задаётся классом (например `h-7`), ширина подстраивается под пропорции.
 */
export function SiteLogo({ className, priority = false }: SiteLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Объекты.online"
      width={240}
      height={80}
      className={cn("h-7 w-auto max-w-[min(100%,12rem)] object-contain object-left", className)}
      priority={priority}
    />
  );
}
