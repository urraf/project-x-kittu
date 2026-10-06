/** Renders plain text with URLs turned into safe external links, preserving line breaks. */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent underline-offset-2 hover:underline">
            {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
