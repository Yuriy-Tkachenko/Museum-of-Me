export type ReferenceExhibit = {
  id: "coffee" | "cat" | "petersburg" | "laptop" | "vinyl";
  title: string;
  alt: string;
  width: number;
  height: number;
  story: string;
};

export const referenceExhibits: ReferenceExhibit[] = [
  { id: "coffee", title: "Чёрный кофе", alt: "Чашка чёрного кофе на блюдце", width: 194, height: 173, story: "Кофе, с которого начинаются все наши разговоры." },
  { id: "cat", title: "Твой кот ♡", alt: "Полосатый кот с большими глазами", width: 160, height: 164, story: "Тот самый взгляд, который невозможно не сфотографировать." },
  { id: "petersburg", title: "Петербург ночью", alt: "Огни ночного города отражаются в канале", width: 203, height: 175, story: "Город, который особенно похож на тебя после заката." },
  { id: "laptop", title: "Ноутбук с 40 вкладками", alt: "Открытый ноутбук на столе в тёплом свете лампы", width: 186, height: 150, story: "Потому что закрыть вкладку — значит потерять идею." },
  { id: "vinyl", title: "Это трек", alt: "Чёрная виниловая пластинка с жёлтой этикеткой", width: 109, height: 107, story: "Та самая песня, которую мы каждый раз включаем ещё раз." },
];
