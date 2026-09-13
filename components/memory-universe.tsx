"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type CSSProperties } from "react";

export type Memory = { id: string; title: string; caption: string; imageUrl: string | null; symbol?: string };
export const sampleMemories: Memory[] = [
  { id: "coffee", title: "One more coffee", caption: "You always order another cup so we can stay a little longer.", imageUrl: "/images/coffee.jpg" },
  { id: "flowers", title: "Just-because flowers", caption: "You never needed an occasion to make someone's day.", imageUrl: "/images/flowers.jpg" },
  { id: "camera", title: "The little moments", caption: "Somehow, you're always the one who remembers to take a photo.", imageUrl: "/images/camera.jpg" },
  { id: "sea", title: "Chasing the last light", caption: "That evening we missed the bus and stayed to watch the sea.", imageUrl: "/images/sea.jpg" },
  { id: "vinyl", title: "One last song", caption: "No one leaves the kitchen until your playlist is finished.", imageUrl: "/images/vinyl.jpg" },
  { id: "book", title: "A well-loved story", caption: "Every book you lend me has a little piece of you between its pages.", imageUrl: "/images/book.jpg" },
];
export function MemoryUniverse({ memories = sampleMemories, name = "Mila", portrait = false, compact = false, interactive = true, hidden = false }: { memories?: Memory[]; name?: string; portrait?: boolean; compact?: boolean; interactive?: boolean; hidden?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const items = hidden ? Array.from({ length: 6 }, (_, i) => ({ id: String(i), title: "A memory, still a secret", caption: "Every story will appear when the museum opens.", imageUrl: null, symbol: "✦" })) : memories.slice(0, 6);
  return <div className={`memory-universe ${compact ? "universe-compact" : ""} ${paused ? "universe-paused" : ""} ${portrait ? "universe-portrait" : "universe-personal"}`}>
    <div className="universe-glow" aria-hidden="true" /><div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
    <div className="universe-center">{portrait ? <div className="reference-portrait" role="img" aria-label="The girl from the reference, surrounded by memories" /> : <div className="person-medallion"><span aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "M"}</span><p>A world of<br /><em translate="no">{name}</em></p></div>}<div className="portrait-name"><span>A MUSEUM OF</span><strong translate="no">{name}</strong><small>through the eyes of friends</small></div></div>
    {items.map((memory, index) => <div key={memory.id} className={`orbit-position orbit-position-${index}`} style={{ "--drift-delay": `${index * -2.4}s`, "--tilt": `${[-8,7,-5,8,-7,5][index]}deg` } as CSSProperties}>
      <button type="button" className="orbit-memory" disabled={!interactive || hidden} onClick={() => { setSelected(selected === index ? null : index); setPaused(true); }} aria-expanded={interactive && !hidden ? selected === index : undefined} aria-label={hidden ? "A hidden memory" : `Read memory: ${memory.title}`}>
        {memory.imageUrl ? <img src={memory.imageUrl} alt="" draggable={false} /> : <span className="orbit-symbol" aria-hidden="true">{memory.symbol ?? "✦"}</span>}
        <span className="orbit-memory-label"><span>{String(index + 1).padStart(2, "0")}</span><span translate="no">{hidden ? "Still a secret" : memory.title}</span></span>
      </button>
    </div>)}
    {selected !== null && items[selected] && <div className="memory-note" role="region" aria-label="Selected memory"><button className="note-close" aria-label="Close memory" onClick={() => setSelected(null)}>×</button><span className="eyebrow">A friend remembers</span><p translate="no">“{items[selected].caption}”</p></div>}
    {!compact && <div className="universe-controls"><span>{hidden ? "Your stories are still a surprise" : interactive ? "Each little thing holds a story. Tap to discover." : "A portrait, made of memories."}</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume memory motion" : "Pause memory motion"}>{paused ? "Play motion" : "Pause motion"} <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span></button></div>}
  </div>;
}
