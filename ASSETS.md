# Design assets

The sample museum uses the portrait from the reference image supplied for this project. It is displayed with a CSS crop and a soft SVG silhouette mask; the source file is unchanged. The sample character and memory captions are fictional. Real museums show the owner's name and actual contributed exhibits.

Photographs are locally hosted copies from Pexels:

- Coffee: https://www.pexels.com/photo/302899/
- White daisies: https://www.pexels.com/photo/bouquet-of-fresh-white-daisies-by-window-29335776/
- Camera: https://www.pexels.com/photo/90946/
- Sunset at sea: https://www.pexels.com/photo/189349/
- Vinyl record: https://www.pexels.com/photo/167092/
- Book: https://www.pexels.com/photo/46274/

Instrument Serif comes from the Google Fonts repository, with its SIL Open Font License in `public/fonts/OFL.txt`. Fonts and decorative photos load from this application, without third-party font or image requests on the landing page.

The animated composition is implemented in `components/memory-universe.tsx`. It supports keyboard interaction, pausing, and prefers-reduced-motion. Locked museums use symbolic placeholders, never private exhibit photos.
