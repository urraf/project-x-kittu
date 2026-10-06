import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoverImage } from "@/components/blog/CoverImage";
import { PostCard } from "@/components/blog/PostCard";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { CommentCountLink, CommentsSection, EngagementProvider, LikeButton, ViewCount } from "@/components/blog/Engagement";
import { ShareButton } from "@/components/ui/ShareButton";
import { YouTubeIcon } from "@/components/ui/icons";
import { LiteYouTube } from "@/components/video/LiteYouTube";
import { withHeadingIds } from "@/lib/content/html";
import { absoluteUrl } from "@/lib/site";
import { formatDate, slugify } from "@/lib/utils/text";
import type { PostFull, PostSummary } from "@/lib/types";
import type { SiteSettings } from "@/lib/validation/settings";

/** The full article layout. Shared by the public page and the admin preview. */
export function ArticleView({ post, related, settings, preview = false }: { post: PostFull; related: PostSummary[]; settings: SiteSettings; preview?: boolean }) {
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
      <article>
        <ReadingProgress targetId="article-body" />
        <header className="pb-12 pt-32 md:pt-40">
          <div className="container-x max-w-5xl">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
              <Link href="/blog" className="group inline-flex items-center gap-1.5 hover:text-ink">
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Blog
              </Link>
              <span aria-hidden>/</span>
              <Link href={`/blog/category/${slugify(post.category)}`} className="hover:text-ink">{post.category}</Link>
            </nav>
            <h1 className="display mt-8 text-[2.9rem] leading-[0.98] md:text-[5rem]">{post.title}</h1>
            {post.excerpt && <p className="mt-7 max-w-3xl font-[family-name:var(--font-prose)] text-xl leading-relaxed text-ink-2 md:text-[1.45rem]">{post.excerpt}</p>}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-6">
              <div className="flex items-center gap-3.5">
                {author.avatar && (
                  <span className="relative size-11 overflow-hidden rounded-full bg-paper-3">
                    <Image src={author.avatar} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                )}
                <div className="text-sm">
                  <p className="font-medium text-ink">{author.name}</p>
                  <p className="text-muted">
                    {post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : "Draft"}
                    {" · "}
                    {post.readingTime} min read
                    {updated ? <> · Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt, "short")}</time></> : null}
                  </p>
                  <p className="mt-0.5 flex items-center gap-3 text-muted"><ViewCount /></p>
                </div>
              </div>
              <ShareButton url={url} title={post.title} label="Copy link" className="!py-2.5 text-ink" />
            </div>
          </div>
        </header>
  
        <div className="container-x max-w-6xl">
          <figure>
            <CoverImage image={post.coverImage} title={post.title} sizes="(min-width: 1152px) 72rem, 100vw" priority fallbackSize="lg" className="aspect-[16/9] rounded-2xl md:aspect-[2/1]" />
            {post.coverImage?.credit?.name && (
              <figcaption className="mt-3 text-right text-xs text-muted">
                Image:{" "}
                {post.coverImage.credit.url ? (
                  <a href={post.coverImage.credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{post.coverImage.credit.name}</a>
                ) : (
                  post.coverImage.credit.name
                )}
              </figcaption>
            )}
          </figure>
        </div>
  
        <div className="container-x mt-14 grid max-w-6xl gap-12 pb-24 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[14rem_minmax(0,42rem)_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <TableOfContents items={toc} />
            </div>
          </aside>
          <div id="article-body" className="min-w-0">
            <div className="prose-kk" data-dropcap="true" dangerouslySetInnerHTML={{ __html: html }} />
  
            {post.videoId && (
              <div className="mt-14 rounded-2xl border border-line bg-paper-2 p-3">
                <p className="flex items-center gap-2 px-2 pb-3 pt-1 text-sm font-medium text-ink">
                  <YouTubeIcon className="size-4 text-accent" /> Prefer watching? Here&apos;s the companion video.
                </p>
                <LiteYouTube id={post.videoId} title={`Video: ${post.title}`} sizes="(min-width: 1024px) 42rem, 100vw" />
              </div>
            )}
  
            <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-line bg-paper-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-ink">Found this useful?</p>
              <div className="flex flex-wrap gap-2">
                <LikeButton />
                <CommentCountLink />
                <ShareButton url={url} title={post.title} className="!h-11 !py-0 text-ink" />
              </div>
            </div>
  
            {post.tags.length > 0 && (
              <ul className="mt-14 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/blog/tag/${slugify(t)}`} className="chip">#{t}</Link>
                  </li>
                ))}
              </ul>
            )}
  
            <div className="mt-14 flex flex-col gap-6 rounded-2xl bg-night p-7 text-cream sm:flex-row sm:items-center">
              {author.avatar && (
                <span className="relative size-20 shrink-0 overflow-hidden rounded-full ring-4 ring-accent">
                  <Image src={author.avatar} alt={author.name} fill sizes="80px" className="object-cover" />
                </span>
              )}
              <div>
                <p className="kicker text-cream-muted">Written by</p>
                <p className="display mt-1 text-3xl">{author.name}</p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/70">{author.bio}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link href="/journey" className="link-underline">My journey</Link>
                  {settings.social.youtube && <a href={settings.social.youtube} target="_blank" rel="noopener noreferrer" className="link-underline">YouTube</a>}
                  {settings.social.instagram && <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="link-underline">Instagram</a>}
                </div>
              </div>
            </div>
  
            <CommentsSection author={{ name: author.name, avatar: author.avatar || undefined }} />
          </div>
        </div>
  
        {related.length > 0 && (
          <section className="border-t border-line bg-paper-2 py-20 md:py-28" aria-labelledby="related-heading">
            <div className="container-x">
              <h2 id="related-heading" className="display text-4xl md:text-5xl">Keep <em className="text-accent">reading</em></h2>
              <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          </section>
        )}
      </article>
    </EngagementProvider>
  );
}
