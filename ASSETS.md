# Design assets

Portrait background removal uses Google MediaPipe Tasks Vision 1.1.0 and the SelfieSegmenter square float16 v1 model, licensed under Apache 2.0. Runtime files and the 249 KB model are self-hosted in `public/models/portrait`; the model comes from https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite. Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf. Processing runs locally in the browser; it does not upload images to Google. The runtime loads on demand, and the original photograph remains available when segmentation fails or is undone. Model card limitations apply, particularly to fine hair, fingers, multiple people and low contrast photos.

The landing page uses a newly generated fictional adult woman in `public/images/hero-woman-v2.webp`. Created with the built-in ImageGen tool and stored as an optimized WebP asset. The landing page, creation and sign-in pages, and sample gallery share this portrait and the new editorial styling. The sample character and memory captions are fictional. Real museums show the owner's name and actual contributed exhibits.

Generation prompt: "Use case: photorealistic-natural. Asset type: transparent cutout portrait for an editorial personal-memory museum website. Create a new fictional adult woman about 26 years old, warm olive skin with natural freckles, shoulder-length wavy dark brown hair with a soft fringe, brown eyes, wearing a simple textured burnt-orange knit sweater. Waist-up portrait, body slightly turned, face toward camera, relaxed candid smile, one hand gently touching her hair. Sophisticated analog lifestyle photography, warm soft daylight, authentic skin texture, subtle film grain, realistic anatomy. Entire head, hair, shoulders and torso visible, no cropping of hair or arms. Subject isolated on genuinely transparent background, no backdrop, no objects, no frame, no lettering, no watermark. Portrait composition with space around the silhouette. This is one standalone woman asset; do not include surrounding photos or UI."

Photographs are locally hosted copies from Pexels:

The carousel, sample gallery, and landing photo cards use the `*-hq.webp` assets. They were downloaded from the original Pexels photos (4,032–6,016 pixels on their longest side), then encoded at WebP quality 96 with a maximum edge of 3,200 pixels, without upscaling. The older 600-pixel JPG files are no longer referenced by these components.

- Coffee: https://www.pexels.com/photo/302899/
- White daisies: https://www.pexels.com/photo/bouquet-of-fresh-white-daisies-by-window-29335776/
- Camera: https://www.pexels.com/photo/90946/
- Sunset at sea: https://www.pexels.com/photo/189349/
- Vinyl record: https://www.pexels.com/photo/167092/
- Book: https://www.pexels.com/photo/46274/

Instrument Serif comes from the Google Fonts repository, with its SIL Open Font License in `public/fonts/OFL.txt`. Fonts and decorative photos load from this application, without third-party font or image requests on the landing page.

The landing page's continuous 48-second elliptical orbit is implemented in `components/hero-memory-orbit.tsx`. Cards change scale and pass behind/in front of the portrait. It supports pausing, pointer and keyboard interaction, and prefers-reduced-motion. Personal museum compositions use `components/memory-universe.tsx`. Locked museums use symbolic placeholders, never private exhibit photos.
