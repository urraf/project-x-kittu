import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverImage } from "@/components/blog/CoverImage";
import { formatCompact, formatDate } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { PostSummary } from "@/lib/types";

function Meta({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 text-[0.8rem] text-muted", className)}>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, "short")}</time>
      <span aria-hidden>·</span>
      <span>{post.readingTime} min read</span>
      {post.views > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>{formatCompact(post.views)} views</span>
        </>
      )}
    </p>
  );
}

export function PostCard({
  post,
  variant = "standard",
  size = "md",
  priority = false,
}: {
  post: PostSummary;
  variant?: "standard" | "feature" | "compact";
  size?: "md" | "lg";
  priority?: boolean;
}) {
  const href = `/blog/${post.slug}`;

  if (variant === "feature") {
    return (
      <article className="group grid items-center gap-8 md:grid-cols-12 md:gap-12">
        <Link href={href} className="md:col-span-7" tabIndex={-1} aria-hidden>
          <CoverImage image={post.coverImage} title={post.title} sizes="(min-width: 768px) 58vw, 100vw" priority={priority} fallbackSize="lg" className="aspect-[16/10] rounded-2xl" />
        </Link>
        <div className="md:col-span-5">
          <p className="kicker text-accent-deep">{post.category}</p>
          <h3 className="display mt-4 text-4xl md:text-[3.4rem]">
            <Link href={href} className="link-underline">{post.title}</Link>
          </h3>
          {post.excerpt && <p className="mt-5 line-clamp-3 text-[1.05rem] leading-relaxed text-ink-2">{post.excerpt}</p>}
          <div className="mt-6 flex items-center justify-between gap-4">
            <Meta post={post} />
            <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              Read <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="group flex items-start gap-5 py-5">
        <div className="min-w-0 flex-1">
          <p className="kicker text-accent-deep">{post.category}</p>
          <h3 className="mt-2 text-[1.12rem] font-medium leading-snug tracking-[-0.01em]">
            <Link href={href} className="link-underline">{post.title}</Link>
          </h3>
          <Meta post={post} className="mt-2" />
        </div>
        <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
          <CoverImage image={post.thumbnail ?? post.coverImage} title={post.title} sizes="128px" fallbackSize="sm" variant="thumb" className="aspect-[4/3] w-28 rounded-lg md:w-32" />
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <Link href={href} tabIndex={-1} aria-hidden>
        <CoverImage image={post.thumbnail ?? post.coverImage} title={post.title} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" priority={priority} variant="thumb" className="aspect-[3/2] rounded-xl" />
      </Link>
      <p className="kicker mt-5 text-accent-deep">{post.category}</p>
      <h3 className={cn("display mt-3 leading-[1.05]", size === "lg" ? "text-4xl md:text-[3.2rem] md:leading-[1]" : "text-[1.8rem]")}>
        <Link href={href} className="link-underline">{post.title}</Link>
      </h3>
      {post.excerpt && <p className={cn("mt-3 line-clamp-2 leading-relaxed text-ink-2", size === "lg" ? "text-[1.08rem]" : "text-[0.97rem]")}>{post.excerpt}</p>}
      <Meta post={post} className="mt-4" />
    </article>
  );
}
