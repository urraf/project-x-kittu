import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CoverImage } from "@/components/blog/CoverImage";
import { PostCard } from "@/components/blog/PostCard";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { CommentCountLink, CommentsSection, EngagementProvider, LikeButton, ViewCount } from "@/components/blog/Engagement";
import { SunMark } from "@/components/site/Logo";
import { ShareButton } from "@/components/ui/ShareButton";
import { YouTubeIcon } from "@/components/ui/icons";
import { LiteYouTube } from "@/components/video/LiteYouTube";
import { withHeadingIds } from "@/lib/content/html";
import { absoluteUrl } from "@/lib/site";
import { formatDate, slugify } from "@/lib/utils/text";
import type { PostFull, PostSummary } from "@/lib/types";
import type { SiteSettings } from "@/lib/validation/settings";

type Category = { name: string; slug: string; count: number };

/** Compact suggestion row used in the sidebar. */
function SuggestedPost({ post }: { post: PostSummary }) {
  const href = `/blog/${post.slug}`;
  return (
    <li>
      <Link href={href} className="group flex items-start gap-3">
        <CoverImage image={post.thumbnail ?? post.coverImage} title={post.title} sizes="88px" fallbackSize="sm" variant="thumb" className="aspect-[4/3] w-[5.5rem] shrink-0 rounded-lg" />
        <span className="min-w-0">
          <span className="kicker block !text-[0.62rem] text-accent-deep">{post.category}</span>
          <span className="mt-0.5 line-clamp-2 block text-[0.88rem] font-medium leading-snug text-ink group-hover:text-accent-deep">{post.title}</span>
          <span className="mt-1 block text-xs text-muted">
            {formatDate(post.publishedAt, "short")} · {post.readingTime} min
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The full article layout. Shared by the public page and the admin preview. */
export function ArticleView({
  post,
  related,
  settings,
  categories = [],
  preview = false,
}: {
  post: PostFull;
  related: PostSummary[];
  settings: SiteSettings;
  categories?: Category[];
  preview?: boolean;
}) {
  const { html, toc } = withHeadingIds(post.content);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const author = { name: post.author.name || settings.profile.name, avatar: post.author.avatar || settings.profile.avatarUrl, bio: post.author.bio || settings.profile.shortBio };
  const updated = post.publishedAt && new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 86400_000;

  return (
    <EngagementProvider
      postId={post.id}
      initial={{ views: post.views, likes: post.likes, liked: false, commentCount: post.commentCount }}
      interactive={!preview && post.status === "published"}
    >
      <ReadingProgress targetId="article-body" />
      <div className="container-x grid grid-cols-1 gap-12 pb-20 pt-28 md:pt-32 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14 xl:grid-cols-[11.5rem_minmax(0,1fr)_18rem] xl:gap-12">
        {/* Left: table of contents (wide screens) */}
        <aside className="hidden xl:block" aria-label="On this page">
          <div className="sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto pb-6 pr-2 no-scrollbar">
            <TableOfContents items={toc} />
          </div>
        </aside>

        {/* Middle: the article */}
        <article id="article-body" className="mx-auto w-full min-w-0 max-w-[44rem]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
            <Link href="/blog" className="group inline-flex items-center gap-1.5 hover:text-ink">
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Blog
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/blog/category/${slugify(post.category)}`} className="hover:text-ink">{post.category}</Link>
          </nav>

          <h1 className="display mt-5 text-[2.3rem] leading-[1.03] md:text-[3.1rem]">{post.title}</h1>
          {post.excerpt && <p className="mt-5 font-[family-name:var(--font-prose)] text-[1.13rem] leading-relaxed text-ink-2 md:text-[1.25rem]">{post.excerpt}</p>}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
            <div className="flex items-center gap-3">
              {author.avatar && (
                <span className="relative size-10 overflow-hidden rounded-full bg-paper-3">
                  <Image src={author.avatar} alt="" fill sizes="40px" className="object-cover" />
                </span>
              )}
              <div className="text-sm">
                <p className="font-medium text-ink">{author.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-muted">
                  {post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : <span>Draft</span>}
                  <span aria-hidden>·</span>
                  <span>{post.readingTime} min read</span>
                  {updated ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt, "short")}</time></span>
                    </>
                  ) : null}
                  <ViewCount />
                </p>
              </div>
            </div>
            <ShareButton url={url} title={post.title} label="Copy link" className="!py-2 text-ink" />
          </div>

          <figure className="mt-7">
            <CoverImage image={post.coverImage} title={post.title} sizes="(min-width: 1024px) 44rem, 100vw" priority fallbackSize="lg" className="aspect-[16/9] rounded-2xl" />
            {post.coverImage?.credit?.name && (
              <figcaption className="mt-2 text-right text-xs text-muted">
                Image:{" "}
                {post.coverImage.credit.url ? (
                  <a href={post.coverImage.credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{post.coverImage.credit.name}</a>
                ) : (
                  post.coverImage.credit.name
                )}
              </figcaption>
            )}
          </figure>

          <div className="prose-kk mt-10" data-dropcap="true" dangerouslySetInnerHTML={{ __html: html }} />

          {post.videoId && (
            <div className="mt-12 rounded-2xl border border-line bg-paper-2 p-3">
              <p className="flex items-center gap-2 px-2 pb-3 pt-1 text-sm font-medium text-ink">
                <YouTubeIcon className="size-4 text-accent" /> Prefer watching? Here&apos;s the companion video.
              </p>
              <LiteYouTube id={post.videoId} title={`Video: ${post.title}`} sizes="(min-width: 1024px) 44rem, 100vw" />
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-line bg-paper-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium text-ink">Found this useful?</p>
            <div className="flex flex-wrap gap-2">
              <LikeButton />
              <CommentCountLink />
              <ShareButton url={url} title={post.title} className="!h-11 !py-0 text-ink" />
            </div>
          </div>

          {post.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}>
                  <Link href={`/blog/tag/${slugify(t)}`} className="chip">#{t}</Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-col gap-5 rounded-2xl bg-night p-6 text-cream sm:flex-row sm:items-center">
            {author.avatar && (
              <span className="relative size-16 shrink-0 overflow-hidden rounded-full ring-4 ring-accent">
                <Image src={author.avatar} alt={author.name} fill sizes="64px" className="object-cover" />
              </span>
            )}
            <div>
              <p className="kicker text-cream-muted">Written by</p>
              <p className="display mt-1 text-2xl">{author.name}</p>
              <p className="mt-1.5 text-[0.92rem] leading-relaxed text-cream/70">{author.bio}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/journey" className="link-underline">My journey</Link>
                {settings.social.youtube && <a href={settings.social.youtube} target="_blank" rel="noopener noreferrer" className="link-underline">YouTube</a>}
                {settings.social.instagram && <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="link-underline">Instagram</a>}
              </div>
            </div>
          </div>

          <CommentsSection author={{ name: author.name, avatar: author.avatar || undefined }} />
        </article>

        {/* Right: suggestions (desktop sidebar) */}
        <aside className="hidden lg:block" aria-label="Suggested reading">
          <div className="no-scrollbar sticky top-24 max-h-[calc(100svh-7rem)] space-y-5 overflow-y-auto pb-4">
            {related.length > 0 && (
              <section className="rounded-2xl border border-line bg-[#fffdf9] p-5">
                <h2 className="kicker flex items-center gap-2 text-muted">
                  <span className="h-px w-6 bg-accent" /> More to read
                </h2>
                <ul className="mt-4 space-y-4">
                  {related.slice(0, 5).map((p) => <SuggestedPost key={p.id} post={p} />)}
                </ul>
                <Link href="/blog" className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  <span className="link-underline">All articles</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </section>
            )}

            {settings.social.youtube && (
              <section className="grain relative overflow-hidden rounded-2xl bg-night p-5 text-cream">
                <span aria-hidden className="absolute -right-10 -top-10 size-28 rounded-full bg-accent/90" />
                <div className="relative z-[2]">
                  <SunMark className="size-7" />
                  <p className="display mt-3 text-2xl leading-tight">Prefer watching?</p>
                  <p className="mt-1.5 text-sm text-cream/70">Step-by-step video guides on {settings.profile.channelName}.</p>
                  <a href={`${settings.social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-4 !px-4 !py-2.5 text-sm">
                    <YouTubeIcon className="size-4" /> Subscribe
                  </a>
                </div>
              </section>
            )}

            {categories.length > 0 && (
              <section>
                <h2 className="kicker flex items-center gap-2 text-muted">
                  <span className="h-px w-6 bg-accent" /> Topics
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/blog/category/${c.slug}`} className="chip" data-active={c.name === post.category}>
                        {c.name} <span className="font-mono text-[0.68rem] opacity-60">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </aside>
      </div>

      {/* Phones & tablets: suggestions below the article */}
      {related.length > 0 && (
        <section className="border-t border-line bg-paper-2 py-16 lg:hidden" aria-labelledby="related-heading">
          <div className="container-x">
            <h2 id="related-heading" className="display text-4xl">Keep <em className="text-accent">reading</em></h2>
            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
              {related.slice(0, 4).map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </EngagementProvider>
  );
}
