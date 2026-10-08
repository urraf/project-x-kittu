import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ImageDTO } from "@/lib/types";

/** Post cover with blur-up placeholder, or an on-brand typographic fallback when no image exists. */
export function CoverImage({
  image,
  title,
  sizes,
  priority = false,
  className,
  fallbackSize = "md",
  variant = "full",
}: {
  image?: ImageDTO;
  title: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackSize?: "sm" | "md" | "lg";
  /** "thumb" uses the small (720px) stored version: much lighter for cards. */
  variant?: "thumb" | "full";
}) {
  if (image?.url) {
    const src = variant === "thumb" ? image.url.replace(/(\/api\/media\/[a-f0-9]{24}\/)full\.webp$/, "$1thumb.webp") : image.url;
    return (
      <div className={cn("img-zoom relative overflow-hidden bg-paper-3", className)}>
        <Image
          src={src}
          alt={image.alt || title}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div className={cn("relative flex items-end overflow-hidden bg-night-2 p-5 text-cream", className)} aria-hidden>
      <span className="absolute -right-[12%] -top-[20%] aspect-square w-[62%] rounded-full bg-accent/90" />
      <span
        className={cn(
          "display relative line-clamp-3 max-w-[85%]",
          fallbackSize === "lg" ? "text-4xl md:text-5xl" : fallbackSize === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        {title}
      </span>
    </div>
  );
}
