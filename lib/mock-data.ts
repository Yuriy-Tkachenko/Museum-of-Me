export type Exhibit = {
  id: string;
  title: string;
  note: string;
  from: string;
  color: string;
  symbol: string;
};

export const museum = {
  name: "Mila’s Museum",
  slug: "mila",
  token: "mila-7x3p",
  description: "A small collection of the things that make Mila, Mila.",
  collected: 7,
  target: 12,
};

export const exhibits: Exhibit[] = [
  { id: "01", title: "The red scarf", note: "For all the walks where the weather did not matter.", from: "Lena", color: "#d9e9d2", symbol: "✳" },
  { id: "02", title: "A blurry sunset", note: "You always stop to look up, even when we are late.", from: "Anton", color: "#f1cbb8", symbol: "◒" },
  { id: "03", title: "The tiny cinema", note: "Our secret ritual. One ticket, two hours, no phones.", from: "Sofia", color: "#c7d5ee", symbol: "▣" },
  { id: "04", title: "Pistachio gelato", note: "Proof that you can turn an ordinary Tuesday into a holiday.", from: "Max", color: "#e8d6a8", symbol: "✺" },
  { id: "05", title: "A yellow post-it", note: "Your handwriting is the most optimistic thing I know.", from: "Ira", color: "#f2e39d", symbol: "⌁" },
  { id: "06", title: "Late-night radio", note: "For the songs you send when words feel too small.", from: "Nika", color: "#cbc2df", symbol: "◉" },
];
