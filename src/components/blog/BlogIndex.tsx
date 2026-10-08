import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PostSummary } from "@/lib/types";

type Cat = { name: string; slug: string; count: number };

/** Shared listing layout for /blog, category, tag and search results. */
export function BlogIndex({
  kicker,
  title,
  description,
  posts,
  page,
  pages,
  basePath,
  query,
  categories,
  activeCategory,
  showFeature,
}: {
  kicker: string;
  title: React.ReactNode;
  description?: string;
  posts: PostSummary[];
  page: number;
  pages: number;
  basePath: string;
  query?: string;
  categories: Cat[];
  activeCategory?: string;
  showFeature?: boolean;
}) {
  const [feature, ...rest] = showFeature ? posts : [undefined, ...posts];
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <>
      <section className="pb-10 pt-28 md:pt-32">
        <div className="container-x">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="kicker flex items-center gap-3 text-muted" data-reveal>
                <span className="h-px w-8 bg-accent" /> {kicker}
              </p>
              <h1 className="display mt-5 text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-[4.75rem]" data-reveal>{title}</h1>
              {description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2" data-reveal>{description}</p>}
            </div>
            <form action="/blog" method="get" role="search" className="md:col-span-4" data-reveal>
              <label htmlFor="blog-search" className="sr-only">Search articles</label>
              <div className="flex items-center gap-2 rounded-full border border-line bg-[#fffdf9] py-1.5 pl-5 pr-1.5 focus-within:border-ink">
                <Search className="size-4 shrink-0 text-muted" />
                <input id="blog-search" name="q" type="search" defaultValue={query} placeholder="Search guides, e.g. MEXT" className="min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] outline-none placeholder:text-muted" />
                <button type="submit" className="btn btn-ink !px-4 !py-2.5">Search</button>
              </div>
            </form>
          </div>

          {categories.length > 0 && (
            <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href="/blog" className="chip" data-active={!activeCategory && !query}>All</Link>
              {categories.map((c) => (
                <Link key={c.slug} href={`/blog/category/${c.slug}`} className="chip" data-active={activeCategory === c.slug}>
                  {c.name} <span className="font-mono text-[0.7rem] opacity-60">{c.count}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className="pb-28">
        <div className="container-x">
          {posts.length === 0 ? (
            <EmptyState
              title={query ? "Nothing matched that search" : "No articles here yet"}
              description={query ? "Try a broader word like “Japan”, “internship” or “scholarship”." : "New guides and stories are on the way."}
              action={<Link href="/blog" className="btn btn-ink">Browse all articles</Link>}
            />
          ) : (
            <>
              {feature && (
                <div className="border-t border-line pt-12" data-reveal>
                  <PostCard post={feature} variant="feature" priority />
                </div>
              )}
              {rest.length > 0 && (
                <div className={`grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 ${feature ? "mt-20 border-t border-line pt-16" : "border-t border-line pt-12"}`}>
                  {rest.filter(Boolean).map((p, i) => (
                    <div key={p!.id} data-reveal style={{ "--reveal-delay": `${(i % 3) * 70}ms` } as React.CSSProperties}>
                      <PostCard post={p!} priority={!feature && i < 3} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-20 flex items-center justify-between border-t border-line pt-8">
              {page > 1 ? <Link href={href(page - 1)} rel="prev" className="btn btn-ghost"><ArrowLeft className="size-4" /> Newer</Link> : <span />}
              <span className="font-mono text-sm text-muted">Page {page} of {pages}</span>
              {page < pages ? <Link href={href(page + 1)} rel="next" className="btn btn-ghost">Older <ArrowRight className="size-4" /></Link> : <span />}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
