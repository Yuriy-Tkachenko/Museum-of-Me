"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { AnonymousAvatar } from "@/components/anonymous-avatar";
import { PortraitCropEditor, type PortraitCropSource } from "@/components/portrait-crop-editor";
import { removePortraitBackground } from "@/lib/portrait-cutout";

export type PortraitDraft = { file: File; preview: string };

export function PortraitUpload({ value, initialPreview = null, onChange, onBusy, disabled }: { value: PortraitDraft | null; initialPreview?: string | null; onChange: (value: PortraitDraft | null) => void; onBusy: (busy: boolean) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cutout, setCutout] = useState(false);
  const [cropSource, setCropSource] = useState<PortraitCropSource | null>(null);
  const originalRef = useRef<File | null>(null);
  const cutoutRef = useRef<File | null>(null);
  const displayedPreview = value?.preview ?? initialPreview;
  function show(file: File, isCutout: boolean) {
    onChange({ file, preview: URL.createObjectURL(file) });
    setCutout(isCutout);
  }
  async function cutOut(canvas: HTMLCanvasElement) {
    setMessage("Removing the background…");
    try {
      const result = await removePortraitBackground(canvas);
      const blob = await new Promise<Blob | null>(resolve => result.toBlob(resolve, "image/webp", .92));
      if (!blob || blob.size > 4 * 1024 * 1024) throw new Error("Image too large");
      cutoutRef.current = new File([blob], "portrait.webp", { type: "image/webp" });
      show(cutoutRef.current, true);
      setMessage("Background removed. You can keep the original instead.");
    } catch {
      if (originalRef.current) show(originalRef.current, false);
      setMessage("We could not remove the background from this photo. Your original is ready to use.");
    }
  }
  async function toggleBackground() {
    if (busy || disabled || !originalRef.current) return;
    setMessage("");
    if (cutout) { show(originalRef.current, false); return; }
    if (cutoutRef.current) { show(cutoutRef.current, true); return; }
    setBusy(true); onBusy(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(originalRef.current);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas");
      context.drawImage(bitmap, 0, 0);
      await cutOut(canvas);
    } catch { setMessage("We could not remove the background from this photo. Your original is ready to use."); }
    finally { bitmap?.close(); setBusy(false); onBusy(false); }
  }
  async function choose(file: File) {
    if (busy || disabled) return;
    setError(""); setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG, or WebP portrait."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("Your portrait must be smaller than 12 MB."); return; }
    setBusy(true); onBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) { bitmap.close(); throw new Error("No canvas"); }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .92));
      if (!blob || blob.size > 4 * 1024 * 1024) throw new Error("Image too large");
      const prepared = new File([blob], "portrait.webp", { type: "image/webp" });
      if (cropSource) URL.revokeObjectURL(cropSource.preview);
      setCropSource({ file: prepared, preview: URL.createObjectURL(prepared), width: canvas.width, height: canvas.height });
    } catch { setError("We could not prepare this portrait. Try another JPEG, PNG, or WebP."); }
    finally { setBusy(false); onBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function editCurrent() {
    if (!initialPreview || busy || disabled) return;
    setBusy(true); onBusy(true); setError(""); setMessage("Preparing your portrait…");
    try {
      const response = await fetch(initialPreview, { credentials: "omit" });
      if (!response.ok) throw new Error("Could not load portrait");
      const blob = await response.blob();
      setBusy(false); onBusy(false);
      await choose(new File([blob], "portrait.webp", { type: blob.type || "image/webp" }));
    } catch {
      setError("We could not load your current portrait. Upload a new photo instead.");
      setMessage(""); setBusy(false); onBusy(false);
    }
  }
  async function applyCrop(offset: { x: number; y: number }, zoom: number, frameSize: number) {
    if (!cropSource || busy || disabled) return;
    setBusy(true); onBusy(true); setError(""); setMessage("Applying your crop…");
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(cropSource.file);
      const baseScale = Math.max(frameSize / bitmap.width, frameSize / bitmap.height);
      const displayScale = baseScale * zoom;
      const cropSide = Math.min(bitmap.width, bitmap.height) / zoom;
      const centerX = bitmap.width / 2 - offset.x / displayScale;
      const centerY = bitmap.height / 2 - offset.y / displayScale;
      const sourceX = Math.max(0, Math.min(bitmap.width - cropSide, centerX - cropSide / 2));
      const sourceY = Math.max(0, Math.min(bitmap.height - cropSide, centerY - cropSide / 2));
      const outputSize = Math.max(1, Math.min(1600, Math.floor(cropSide)));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas");
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, sourceX, sourceY, cropSide, cropSide, 0, 0, outputSize, outputSize);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .92));
      if (!blob || blob.size > 4 * 1024 * 1024) throw new Error("Image too large");
      const cropped = new File([blob], "portrait.webp", { type: "image/webp" });
      originalRef.current = cropped; cutoutRef.current = null;
      show(cropped, false); URL.revokeObjectURL(cropSource.preview); setCropSource(null);
      setMessage("Crop applied. You can remove the background if you want.");
    } catch { setError("We could not crop this photo. Try again or keep the full photo."); setMessage(""); }
    finally { bitmap?.close(); setBusy(false); onBusy(false); }
  }
  function keepFullPhoto() {
    if (!cropSource) return;
    originalRef.current = cropSource.file; cutoutRef.current = null;
    onChange({ file: cropSource.file, preview: cropSource.preview });
    setCutout(false); setCropSource(null); setMessage("Full photo kept. You can remove the background if you want.");
  }
  function cancelCrop() {
    if (!cropSource) return;
    URL.revokeObjectURL(cropSource.preview); setCropSource(null); setMessage("");
  }
  return <div className="portrait-upload">
    <p className="portrait-upload-heading">Your portrait <span>Optional</span></p>
    <div className={`portrait-upload-panel ${displayedPreview ? "has-portrait" : ""} ${cutout ? "has-cutout" : "has-original"}`}>
      <div className="portrait-upload-thumbnail" aria-hidden="true">{displayedPreview ? <img src={displayedPreview} alt="" /> : <AnonymousAvatar />}</div>
      <div><p>{displayedPreview ? "A little more you." : "Put yourself at the centre."}</p><small>A clear photo of your face works best. Your portrait appears in your gallery when it opens.</small>
        <div className="portrait-upload-actions">{initialPreview && !value && <button type="button" disabled={busy || disabled} onClick={() => void editCurrent()}>{busy ? "Preparing your portrait…" : "Adjust current photo"}</button>}<button type="button" disabled={busy || disabled} onClick={() => inputRef.current?.click()}>{busy ? "Preparing your portrait…" : displayedPreview ? "Upload new photo" : "Upload your photo"}<span aria-hidden="true">↗</span></button>{value && <button type="button" disabled={busy || disabled} onClick={() => void toggleBackground()}>{cutout ? "Keep original photo" : "Remove background"}</button>}{displayedPreview && <button type="button" disabled={busy || disabled} className="portrait-remove" onClick={() => { onChange(null); originalRef.current = null; cutoutRef.current = null; setCutout(false); setError(""); setMessage(""); }}>Remove photo</button>}</div>
      </div>
    </div>
    <input ref={inputRef} aria-label="Upload your portrait" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy || disabled} onChange={event => { const file = event.target.files?.[0]; if (file) void choose(file); }} className="sr-only" />
    {cropSource && <PortraitCropEditor source={cropSource} disabled={busy || disabled} onApply={(offset, zoom, frameSize) => void applyCrop(offset, zoom, frameSize)} onKeep={keepFullPhoto} onCancel={cancelCrop} />}
    <small className="portrait-upload-hint">JPEG, PNG or WebP · Up to 12 MB · Optional</small>
    {message && <p role="status" className="portrait-upload-hint">{message}</p>}
    {error && <p role="alert" className="mt-3 text-xs text-red-800">{error}</p>}
  </div>;
}
