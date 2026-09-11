import type { Exhibit } from "@/lib/mock-data";

export function ExhibitCard({ exhibit, index }: { exhibit: Exhibit; index: number }) {
  return <article className="group grid grid-cols-[4.2rem_1fr] gap-4 border-t border-ink/15 py-5 md:grid-cols-[5rem_1fr_5rem] md:gap-8 md:py-7">
    <div className="flex h-[4.2rem] w-[4.2rem] items-center justify-center text-3xl md:h-20 md:w-20 md:text-4xl" style={{ backgroundColor: exhibit.color }}>{exhibit.symbol}</div>
    <div><div className="mb-2 flex items-center gap-3"><span className="text-[10px] uppercase tracking-[.18em] text-muted">0{index + 1}</span><span className="text-[10px] uppercase tracking-[.18em] text-muted">from {exhibit.from}</span></div><h3 className="display text-2xl md:text-3xl">{exhibit.title}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">“{exhibit.note}”</p></div>
    <span className="hidden self-start pt-1 text-right text-xs text-muted md:block">2024</span>
  </article>;
}
