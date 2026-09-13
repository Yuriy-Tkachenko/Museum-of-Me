"use client";

import { motion } from "framer-motion";

const gradients = ["from-[#d4f05d]/70 via-[#d8e9c9] to-[#e9e7df]", "from-[#f1cbb8] via-[#e6d4c1] to-[#e9e7df]", "from-[#c7d5ee] via-[#d8d6e5] to-[#e9e7df]", "from-[#e8d6a8] via-[#efe5c9] to-[#e9e7df]"];

export function LockedExhibitCard({ index }: { index: number }) {
  return <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, delay: index * .06 }} className={`relative min-h-[190px] overflow-hidden rounded-sm bg-gradient-to-br ${gradients[index % gradients.length]} p-5`}>
    <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
    <div className="relative flex h-full min-h-[150px] flex-col justify-between"><div className="flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-ink/45"><span>Exhibit {String(index + 1).padStart(2, "0")}</span><span>Locked</span></div><div><div className="mb-3 text-2xl text-ink/45">⌑</div><p className="display text-2xl text-ink/65">A memory is waiting</p></div></div>
  </motion.article>;
}
