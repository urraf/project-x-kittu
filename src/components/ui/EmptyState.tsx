import { SunMark } from "@/components/site/Logo";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <SunMark className="size-10 opacity-80" />
      <h3 className="display mt-5 text-3xl">{title}</h3>
      {description && <p className="mt-3 max-w-md text-ink-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
