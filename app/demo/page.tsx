"use client";
import { MuseumReveal } from "@/components/museum-reveal";
import { sampleMemories } from "@/components/memory-universe";
export default function DemoPage() { return <MuseumReveal demo name="Mila" slug="demo" exhibits={sampleMemories.map((memory) => ({ ...memory, symbol: "✦", color: "#59452e" }))} />; }

