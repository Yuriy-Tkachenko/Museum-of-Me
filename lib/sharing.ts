export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Safari / denied clipboard: try selected text. */ }
  }
  const input = document.createElement("textarea");
  input.value = text; input.style.position = "fixed"; input.style.opacity = "0";
  document.body.append(input); input.select();
  const copied = document.execCommand("copy"); input.remove();
  if (!copied) throw new Error("Copy is unavailable. Select the link below and copy it manually.");
}
export function cancelledShare(error: unknown) { return error instanceof Error && error.name === "AbortError"; }
