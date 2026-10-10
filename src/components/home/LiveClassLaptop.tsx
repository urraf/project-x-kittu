import Image from "next/image";
import { MessageSquare, Mic, MicOff, PhoneOff, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** 3D art: Microsoft Fluent Emoji (MIT licence). */
const art = (name: string) => `/images/3d/${name}.webp`;

/**
 * Hero visual: a laptop showing a live group class, drawn with HTML so it stays
 * crisp at any size. Purely decorative; the real session details float on top.
 */
export function LiveClassLaptop({ hostName, topic }: { hostName: string; topic: string }) {
  const tiles = [
    { img: "teacher", name: `${hostName} · Host`, tint: "bg-indigo-soft", speaking: true },
    { img: "student-woman", name: "Priya", tint: "bg-sakura" },
    { img: "learner-man", name: "Aarav", tint: "bg-matcha-soft", muted: true },
    { img: "student-man-2", name: "Rohan", tint: "bg-accent-soft", muted: true },
  ];

  return (
    <div className="relative" aria-hidden>
      {/* Soft washi circles behind the laptop */}
      <span className="absolute -right-4 top-2 size-40 rounded-full bg-accent-soft sm:size-56" />
      <span className="absolute -left-2 bottom-10 size-24 rounded-full bg-sakura sm:size-32" />
      <span className="absolute right-[18%] -top-4 size-5 rounded-full bg-accent/30" />
      <span className="absolute left-[30%] bottom-2 size-3 rounded-full bg-indigo/30" />

      <div className="relative mx-auto w-[90%] pt-6">
        {/* Screen */}
        <div className="rounded-[1.25rem] bg-ink p-2 shadow-[0_40px_70px_-40px_rgba(29,43,69,0.7)] sm:rounded-[1.6rem] sm:p-3">
          <div className="flex aspect-[16/10] flex-col overflow-hidden rounded-[0.8rem] bg-[#f5f0e7] sm:rounded-[1rem]">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wider text-white sm:text-[0.6rem]">
                  <span className="size-1 animate-pulse rounded-full bg-white sm:size-1.5" /> Live
                </span>
                <span className="truncate text-[0.55rem] font-medium text-ink sm:text-xs">{topic}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[0.5rem] text-ink-2 sm:text-[0.65rem]"><Users className="size-2.5 sm:size-3" /> 24</span>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-1 px-1.5 sm:gap-1.5 sm:px-2.5">
              {tiles.map((t) => (
                <div key={t.name} className={cn("relative overflow-hidden rounded-md sm:rounded-lg", t.tint, t.speaking && "ring-2 ring-accent")}>
                  <Image src={art(t.img)} alt="" width={160} height={160} priority className="absolute bottom-0 left-1/2 h-[88%] w-auto -translate-x-1/2 object-contain" />
                  <span className="absolute bottom-1 left-1 flex max-w-[85%] items-center gap-0.5 truncate rounded bg-[#fffdf9]/90 px-1 py-px text-[0.45rem] font-medium text-ink sm:bottom-1.5 sm:left-1.5 sm:gap-1 sm:px-1.5 sm:text-[0.6rem]">
                    {t.muted ? <MicOff className="size-2 shrink-0 text-accent sm:size-2.5" /> : <Mic className="size-2 shrink-0 text-moss sm:size-2.5" />}
                    <span className="truncate">{t.name}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 py-1.5 sm:gap-2.5 sm:py-2">
              {[Mic, Video, MessageSquare].map((Icon, i) => (
                <span key={i} className="grid size-4 place-items-center rounded-full bg-[#fffdf9] text-ink ring-1 ring-line sm:size-6"><Icon className="size-2 sm:size-3" /></span>
              ))}
              <span className="grid h-4 w-6 place-items-center rounded-full bg-accent text-white sm:h-6 sm:w-9"><PhoneOff className="size-2 sm:size-3" /></span>
            </div>
          </div>
        </div>
        {/* Base */}
        <div className="relative mx-[-5%] h-2.5 rounded-b-[1.2rem] bg-gradient-to-b from-[#d9dee8] to-[#b5bfd0] sm:h-4">
          <span className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-[#a3aec2] sm:h-1.5 sm:w-24" />
        </div>
      </div>

      {/* Floating 3D study objects */}
      <Image src={art("graduation-cap")} alt="" width={120} height={120} className="float-slow absolute -left-1 top-0 w-14 drop-shadow-lg sm:w-20" />
      <Image src={art("cherry-blossom")} alt="" width={96} height={96} className="float-slow absolute right-0 top-[30%] w-10 drop-shadow-md [animation-delay:-2s] sm:w-14" />
      <Image src={art("books")} alt="" width={140} height={140} className="absolute -bottom-3 -left-3 w-16 drop-shadow-lg sm:w-24" />
      <Image src={art("pencil")} alt="" width={96} height={96} className="float-slow absolute -right-1 bottom-6 w-9 drop-shadow-md [animation-delay:-4s] sm:w-12" />
    </div>
  );
}
