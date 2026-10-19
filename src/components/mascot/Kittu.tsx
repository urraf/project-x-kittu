import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Kittu, the brand mascot, in the client's poses (files in /public/images/mascot).
 * Each page uses a different pose so the mascot feels alive rather than repeated.
 */
const POSES = {
  stand: { src: "/images/mascot/kittu.webp", width: 600, height: 888, label: "standing and waving" },
  wave: { src: "/images/mascot/kittu-wave.webp", width: 600, height: 671, label: "sitting and waving" },
  think: { src: "/images/mascot/kittu-think.webp", width: 600, height: 666, label: "thinking" },
  study: { src: "/images/mascot/kittu-study.webp", width: 600, height: 531, label: "studying on a laptop with books" },
  laptop: { src: "/images/mascot/kittu-laptop.webp", width: 413, height: 395, label: "working on a laptop" },
  lie: { src: "/images/mascot/kittu-lie.webp", width: 421, height: 346, label: "resting its head on its paws" },
  boba: { src: "/images/mascot/kittu-boba.webp", width: 397, height: 443, label: "sipping bubble tea" },
  walk: { src: "/images/mascot/kittu-walk.webp", width: 305, height: 470, label: "walking with a backpack" },
  jump: { src: "/images/mascot/kittu-jump.webp", width: 364, height: 377, label: "jumping with joy" },
  ponder: { src: "/images/mascot/kittu-ponder.webp", width: 344, height: 381, label: "wondering" },
  sleep: { src: "/images/mascot/kittu-sleep.webp", width: 416, height: 296, label: "napping" },
  cheer: { src: "/images/mascot/kittu-cheer.webp", width: 343, height: 386, label: "cheering" },
  fuji: { src: "/images/mascot/kittu-fuji.webp", width: 393, height: 317, label: "looking at Mount Fuji" },
} as const;

export type KittuPose = keyof typeof POSES;

export function Kittu({
  pose = "stand",
  className,
  motion = "none",
  priority,
  alt,
  sizes = "16rem",
}: {
  pose?: KittuPose;
  className?: string;
  motion?: "none" | "float" | "sway";
  priority?: boolean;
  /** Defaults to a description of the pose; pass "" when purely decorative. */
  alt?: string;
  sizes?: string;
}) {
  const p = POSES[pose];
  return (
    <Image
      src={p.src}
      alt={alt ?? `Kittu, the Life of KittuKun mascot, ${p.label}`}
      width={p.width}
      height={p.height}
      sizes={sizes}
      priority={priority}
      className={cn("h-auto select-none drop-shadow-[0_18px_22px_rgba(29,43,69,0.18)]", motion === "float" && "float-slow", motion === "sway" && "kittu-sway", className)}
      draggable={false}
    />
  );
}

/** Mascot with a small speech bubble, e.g. a greeting on login or empty pages. */
export function KittuSays({ children, className, pose = "wave", imgClassName, side = "right" }: { children: React.ReactNode; className?: string; pose?: KittuPose; imgClassName?: string; side?: "left" | "right" }) {
  return (
    <div className={cn("relative inline-flex items-end gap-2", side === "left" && "flex-row-reverse", className)}>
      <Kittu pose={pose} className={cn("w-24", imgClassName)} alt="" />
      <p
        className={cn(
          "relative mb-[40%] max-w-[13rem] rounded-2xl border border-line bg-[#fffdf9] px-3.5 py-2.5 text-sm leading-snug text-ink shadow-[0_12px_30px_-20px_rgba(29,43,69,0.5)]",
          "before:absolute before:bottom-3 before:size-3 before:rotate-45 before:border-line before:bg-[#fffdf9]",
          side === "right" ? "before:-left-1.5 before:border-b before:border-l" : "before:-right-1.5 before:border-r before:border-t",
        )}
      >
        {children}
      </p>
    </div>
  );
}
