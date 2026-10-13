"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

export type PortraitCropSource = { file: File; preview: string; width: number; height: number };

export function PortraitCropEditor({ source, disabled, onApply, onKeep, onCancel }: {
  source: PortraitCropSource;
  disabled: boolean;
  onApply: (offset: { x: number; y: number }, zoom: number, frameSize: number) => void;
  onKeep: () => void;
  onCancel: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [frameSize, setFrameSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const baseScale = Math.max(frameSize / source.width, frameSize / source.height);
  const imageWidth = source.width * baseScale * zoom;
  const imageHeight = source.height * baseScale * zoom;
  const maxX = Math.max(0, (imageWidth - frameSize) / 2);
  const maxY = Math.max(0, (imageHeight - frameSize) / 2);
  const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => setFrameSize(frame.clientWidth || 320);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setOffset(current => ({ x: clamp(current.x, maxX), y: clamp(current.y, maxY) }));
  }, [maxX, maxY]);

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y };
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: clamp(drag.originX + event.clientX - drag.x, maxX),
      y: clamp(drag.originY + event.clientY - drag.y, maxY),
    });
  }

  function pointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return <div className="portrait-crop-editor">
    <div>
      <p className="portrait-crop-title">Adjust your photo</p>
      <small>Drag the photo to position it, then use the slider to change its size.</small>
    </div>
    <div ref={frameRef} className="portrait-crop-frame" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
      <img src={source.preview} alt="Portrait crop preview" draggable={false} style={{ width: imageWidth, height: imageHeight, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
      <span aria-hidden="true" className="portrait-crop-grid" />
    </div>
    <label className="portrait-zoom-label"><span>Photo size</span><input aria-label="Photo size" type="range" min="1" max="3" step="0.01" value={zoom} disabled={disabled} onChange={event => setZoom(Number(event.target.value))} /><output>{Math.round(zoom * 100)}%</output></label>
    <div className="portrait-crop-actions">
      <button type="button" disabled={disabled} onClick={() => onApply(offset, zoom, frameSize)} className="portrait-crop-primary">Apply crop</button>
      <button type="button" disabled={disabled} onClick={onKeep}>Keep full photo</button>
      <button type="button" disabled={disabled} onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}
