/** Client-safe YouTube helpers. */

const ID_RE = /^[\w-]{11}$/;

export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (ID_RE.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return ID_RE.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;
      const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[1]!;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function youtubeThumb(id: string, quality: "max" | "hq" | "mq" | "sd" = "hq") {
  const file = { max: "maxresdefault", hq: "hqdefault", mq: "mqdefault", sd: "sddefault" }[quality];
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(id: string, autoplay = false) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
