/**
 * Renders a headline with its final clause in accent italics: the part after
 * the first comma, or the last two words when there is no comma.
 */
export function AccentTitle({ text, accentClass = "text-accent" }: { text: string; accentClass?: string }) {
  const comma = text.indexOf(",");
  let head: string;
  let tail: string;
  if (comma > 0 && comma < text.length - 3) {
    head = text.slice(0, comma + 1);
    tail = text.slice(comma + 1).trim();
  } else {
    const words = text.split(" ");
    const n = words.length > 3 ? 2 : 1;
    head = words.slice(0, -n).join(" ");
    tail = words.slice(-n).join(" ");
  }
  return (
    <>
      {head} <em className={accentClass}>{tail}</em>
    </>
  );
}
