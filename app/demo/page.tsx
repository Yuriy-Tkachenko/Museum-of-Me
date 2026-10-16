import type { Metadata } from "next";
import { DemoMuseum } from "@/components/demo-museum";

export const metadata: Metadata = {
  title: "Museum of Yuri",
  description: "Загляните в готовый Museum of Me — личный музей, собранный из ассоциаций и историй друзей.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() { return <DemoMuseum />; }
