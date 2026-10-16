"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { SketchIcon } from "@/components/sketch-icon";
import { referenceExhibits } from "@/lib/reference-exhibits";

export function ReferenceMuseumCollage({ detailCta = true }: { detailCta?: boolean }) {
  const [selected, setSelected] = useState<(typeof referenceExhibits)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return <section className="reference-collage" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="sr-only">Музей Юрия — глазами друзей</h2>
    <div className="museum-paper museum-paper-one" aria-hidden="true" />
    <div className="museum-paper museum-paper-two" aria-hidden="true" />
    <figure className="museum-owner">
      <Image src="/images/reference/photo-owner.webp" width={270} height={285} alt="Юрий: кудрявый парень в солнечных очках на фоне заката" priority unoptimized />
      <figcaption translate="no"><SketchIcon kind="crown" /><span>Museum<br />of Yuri</span></figcaption>
    </figure>
    {referenceExhibits.map(exhibit => <figure key={exhibit.id} className={`museum-exhibit museum-exhibit-${exhibit.id}`}>
      <button type="button" className="museum-photo-button" aria-labelledby={`${id}-${exhibit.id}`} aria-haspopup="dialog"
        onClick={() => { setSelected(exhibit); dialog.current?.showModal(); }}>
        <Image src={`/images/reference/photo-${exhibit.id}.webp`} width={exhibit.width} height={exhibit.height} alt={exhibit.alt} unoptimized />
      </button>
      <figcaption id={`${id}-${exhibit.id}`} translate="no">{exhibit.title}</figcaption>
    </figure>)}
    <p className="museum-more"><SketchIcon kind="lock" /><span>Ещё больше<br />историй…</span></p>
    <p className="museum-statement">Это всё — ты</p>
    <span className="museum-doodle museum-heart" aria-hidden="true">♡</span>
    <span className="museum-doodle museum-star" aria-hidden="true">☆</span>
    <span className="museum-doodle museum-squiggle" aria-hidden="true">↗</span>
    <dialog ref={dialog} className="reference-exhibit-dialog" aria-labelledby={`${id}-detail-title`}
      onClick={event => { if(event.target===event.currentTarget) dialog.current?.close(); }}>
      <button type="button" className="reference-dialog-close" aria-label="Закрыть экспонат" onClick={() => dialog.current?.close()}>×</button>
      {selected && <Image className="museum-detail-image" src={`/images/reference/photo-${selected.id}.webp`} width={selected.width} height={selected.height} alt={selected.alt} unoptimized />}
      <p className="reference-dialog-eyebrow">Глазами друзей</p>
      <h2 id={`${id}-detail-title`} translate="no">{selected?.title}</h2>
      <p translate="no">{selected?.story}</p>
      {detailCta && <a href="/demo">Заглянуть в музей →</a>}
    </dialog>
  </section>;
}
