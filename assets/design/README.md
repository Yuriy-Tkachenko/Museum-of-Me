# Landing reference artwork

`landing-reference.png` is the unmodified design supplied by the project owner:
`Музей меня_ как тебя видят друзья.png` (1672 × 941).

Run `node scripts/extract-reference-art.mjs` from the repository root to reproduce
six individual `photo-*.webp` photographs in `public/images/reference/`.
The script samples quadrilateral regions and straightens the visible photos,
excluding the overlaid captions and paper. It does not generate new content
or reconstruct portions hidden behind other objects in the flattened reference.

The owner portrait, coffee, cat, Petersburg, laptop and vinyl come directly
from this artboard. Each photo is an independent image inside a semantic figure.
Captions, headings and the logo are selectable text; paper and tape use CSS;
icons are inline SVG. Actual photo buttons open a dialog with the selected photo.
No whole-page or whole-collage screenshot is used by the application.

The five friend portraits in `public/images/reference/friend-*.webp` were
generated separately and are not people from the reference artboard.
