"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { sampleMemories, type Memory } from "@/components/memory-universe";
import { AnonymousAvatar } from "@/components/anonymous-avatar";
import { hasPortraitTransparency } from "@/lib/portrait-cutout";

// A single clock keeps all six memories on the same continuous elliptical path.
// DOM transforms avoid re-rendering React on every animation frame.
export function HeroMemoryOrbit({ compact = false, interactive = true, name = "Mila", portraitUrl, memories = sampleMemories, hidden = false, showPersonalEdit = false }: { compact?: boolean; interactive?: boolean; name?: string; portraitUrl?: string | null; memories?: Memory[]; hidden?: boolean; showPersonalEdit?: boolean }) {
  const items: Memory[] = hidden ? Array.from({ length: 6 }, (_, index) => ({ id: `hidden-${index}`, title: "Still a secret", caption: "", imageUrl: null, symbol: "✦" })) : memories.slice(0, 6);
  const [portraitShape, setPortraitShape] = useState<{ url: string; cutout: boolean } | null>(null);
  const imageUrl = portraitUrl === undefined ? "/images/hero-woman-v2.webp" : portraitUrl ? portraitShape?.url ?? null : null;
  const isCutout = portraitUrl !== undefined && Boolean(portraitUrl) && portraitShape?.cutout;
  useEffect(() => {
    if (!portraitUrl) return;
    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = portraitUrl;
    // Keep the displayed image while Supabase rotates its signed URL.
    // Decode and classify the replacement before committing it to the scene.
    void image.decode().then(() => {
      if (!active) return;
      let cutout = false;
      try { cutout = hasPortraitTransparency(image); } catch { /* use the original photo */ }
      setPortraitShape({ url: portraitUrl, cutout });
    }).catch(() => { /* a failed refresh must not remove the current portrait */ });
    return () => { active = false; };
  }, [portraitUrl]);
  const canInteract = interactive && !hidden;
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const phaseRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [preview, setPreview] = useState<{ index: number; x: number; y: number; rotate: number; scale: number } | null>(null);
  const positionsRef = useRef<{ x: number; y: number; rotate: number; scale: number }[]>([]);
  const reducedMotion = useReducedMotion();

  function previewMemory(index: number) {
    if (!canInteract) return;
    const position = positionsRef.current[index];
    if (position) setPreview({ index, ...position });
  }

  useEffect(() => {
    const root = sceneRef.current?.closest(".editorial-home");
    root?.classList.toggle("motion-paused", paused);
    return () => { root?.classList.remove("motion-paused"); };
  }, [paused]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = scene.clientWidth;
    let height = scene.clientHeight;
    let frame = 0;
    let previous = 0;
    const positionCards = () => {
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        const angle = phaseRef.current + index * (Math.PI * 2 / Math.max(items.length, 1)) - Math.PI / 6;
        const depth = Math.sin(angle);
        const x = Math.cos(angle) * width * .365;
        const y = depth * height * .22;
        positionsRef.current[index] = { x, y, rotate: Math.cos(angle) * 9, scale: .88 + (depth + 1) * .105 };
        card.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${Math.cos(angle) * 9}deg) scale(${.88 + (depth + 1) * .105})`;
        card.style.zIndex = depth > .12 ? "12" : "3";
        card.style.filter = `brightness(${.96 + (depth + 1) * .02})`;
      });
    };
    const observer = new ResizeObserver(() => {
      width = scene.clientWidth;
      height = scene.clientHeight;
      positionCards();
    });
    observer.observe(scene);
    const animate = (time: number) => {
      const delta = previous ? Math.min(time - previous, 40) : 0;
      previous = time;
      if (!paused && selected === null && !hovered && !focused && !reducedMotion.matches && !document.hidden) {
        phaseRef.current += delta * Math.PI * 2 / 48000;
        positionCards();
      }
      frame = requestAnimationFrame(animate);
    };
    positionCards();
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, selected, hovered, focused, items.length]);

  return <div className={`hero-orbit-wrap ${compact ? "hero-orbit-compact" : ""}`}>
    <div className="hero-exhibit-label"><span>THE HUMAN COLLECTION</span>{portraitUrl === undefined ? <span>NO. 001 / MILA</span> : showPersonalEdit ? <button type="button" className="hero-edit-details" onClick={() => window.dispatchEvent(new Event("museum-edit-personal-information"))}><span className="hero-edit-en" translate="no">Edit</span><span className="hero-edit-ru" translate="no">Редактировать</span></button> : <span>YOUR PERSONAL COLLECTION</span>}</div>
    <div ref={sceneRef} className={`hero-orbit-scene ${preview && selected === null ? "has-memory-preview" : ""} ${portraitUrl !== undefined ? "hero-personal-scene" : ""} ${isCutout ? "has-cutout-portrait" : ""}`} aria-label={`${name || "You"} surrounded by memories`}>
      <div className="hero-portrait-halo" aria-hidden="true" />
      <svg className="hero-orbit-lines" viewBox="0 0 700 600" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="350" cy="300" rx="270" ry="160" /><ellipse cx="350" cy="300" rx="244" ry="210" transform="rotate(-22 350 300)" /></svg>
      <span className="hero-spark hero-spark-one" aria-hidden="true">✳</span><span className="hero-spark hero-spark-two" aria-hidden="true">✦</span>
      {imageUrl ? <div className={`hero-new-portrait ${portraitUrl !== undefined ? "hero-uploaded-portrait" : ""} ${isCutout ? "hero-cutout-portrait" : ""}`}><img src={imageUrl} crossOrigin={portraitUrl !== undefined ? "anonymous" : undefined} alt={portraitUrl === undefined ? "Mila, a smiling woman with wavy brown hair in an orange sweater" : `${name || "Your"} portrait`} fetchPriority="high" draggable={false} /></div> : <div className="hero-personal-monogram" aria-hidden="true"><AnonymousAvatar /></div>}
      {items.map((memory, index) => <button key={memory.id} ref={node => { cardsRef.current[index] = node; }} className={`hero-orbit-card hero-card-${index} ${preview?.index === index && selected === null ? "is-previewed" : ""}`} type="button" disabled={!canInteract} aria-hidden={!canInteract || undefined} onPointerEnter={(event) => { if (canInteract && event.pointerType === "mouse") { setHovered(true); previewMemory(index); } }} onPointerLeave={() => { setHovered(false); setPreview(null); }} onFocus={() => { if (canInteract) { setFocused(true); previewMemory(index); } }} onBlur={() => { setFocused(false); setPreview(null); }} onClick={() => { if (canInteract) setSelected(index); }} aria-label={`Read memory: ${memory.title}`} aria-expanded={canInteract ? selected === index : undefined}>
        {memory.imageUrl ? <img src={memory.imageUrl} alt="" draggable={false} /> : <span className="hero-card-symbol" aria-hidden="true">{memory.symbol || "✦"}</span>}<span className="hero-card-caption"><span>{String(index + 1).padStart(2, "0")}</span><span translate={hidden ? undefined : "no"}>{memory.title}</span><span aria-hidden="true">{hidden ? "◌" : "↗"}</span></span>
      </button>)}
      <AnimatePresence>
        {preview && selected === null && <motion.div key={preview.index} className="hero-hover-preview-anchor" aria-hidden="true" initial={{ x: reducedMotion ? 0 : preview.x, y: reducedMotion ? 0 : preview.y, rotate: reducedMotion ? 0 : preview.rotate, scale: reducedMotion ? 1.55 : preview.scale, opacity: 0 }} animate={{ x: 0, y: 0, rotate: 0, scale: 1.55, opacity: 1, transition: { duration: reducedMotion ? 0 : 1.05, ease: [.25, .1, .25, 1], opacity: { duration: reducedMotion ? 0 : .35 } } }} exit={{ x: reducedMotion ? 0 : preview.x, y: reducedMotion ? 0 : preview.y, rotate: reducedMotion ? 0 : preview.rotate, scale: reducedMotion ? 1.55 : preview.scale, opacity: 0, transition: { duration: reducedMotion ? 0 : .8, ease: [.4, 0, .2, 1], opacity: { delay: reducedMotion ? 0 : .2, duration: reducedMotion ? 0 : .6 } } }}>
          <div className="hero-hover-preview">{items[preview.index]?.imageUrl ? <img src={items[preview.index].imageUrl!} alt="" draggable={false} /> : <span className="hero-card-symbol">{items[preview.index]?.symbol || "✦"}</span>}<span className="hero-card-caption"><span>{String(preview.index + 1).padStart(2, "0")}</span><span translate="no">{items[preview.index]?.title}</span><span>↗</span></span></div>
        </motion.div>}
      </AnimatePresence>
      {selected !== null && items[selected] && <div className="hero-memory-detail" role="region" aria-label="Selected memory"><button type="button" aria-label="Close memory" onClick={() => setSelected(null)}>×</button><span className="eyebrow">A friend remembers</span><p translate="no">“{items[selected].caption}”</p><small translate="no">{items[selected].title}</small></div>}
    </div>
    <div className={`hero-portrait-signature ${portraitUrl !== undefined ? "hero-personal-signature" : ""}`}><span>A WORLD OF</span><strong translate={name ? "no" : undefined}>{name || "Your name"}{portraitUrl === undefined ? "." : ""}</strong><span>{portraitUrl === undefined ? "AS SEEN BY HER FRIENDS" : "AS SEEN BY YOUR FRIENDS"}</span></div>
    <div className="hero-orbit-toolbar"><span><span aria-hidden="true">↗</span> {hidden ? "Your stories are still a surprise" : canInteract ? "Little things. Real stories. Tap a memory." : "through the eyes of friends"}</span><button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume memory motion" : "Pause memory motion"} aria-pressed={paused}><span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> {paused ? "Play motion" : "Pause motion"}</button></div>
  </div>;
}
