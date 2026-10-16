import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// The user requested the actual individual photographs from this flattened mockup.
// Sample only visible photo pixels, excluding the baked-in paper and captions.
const destination = resolve("public/images/reference");
await mkdir(destination, { recursive: true });
const { data, info } = await sharp("assets/design/landing-reference.png")
  .removeAlpha().raw().toBuffer({ resolveWithObject: true });
const photos = {
  owner: { width: 270, height: 285, corners: [[974,183],[1227,187],[1215,433],[963,433]] },
  coffee: { width: 194, height: 173, corners: [[770,197],[941,168],[950,300],[775,328]] },
  cat: { width: 160, height: 164, corners: [[1261,102],[1406,132],[1380,253],[1249,230]] },
  petersburg: { width: 203, height: 175, corners: [[730,396],[923,355],[927,515],[764,550]] },
  laptop: { width: 186, height: 150, corners: [[1307,366],[1474,397],[1461,496],[1288,496]] },
  vinyl: { width: 109, height: 107, corners: [[1516,471],[1615,492],[1621,571],[1499,576]] },
};
for (const [name, { width, height, corners: [tl,tr,br,bl] }] of Object.entries(photos)) {
  const output = Buffer.alloc(width * height * 3);
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    const u=x/(width-1), v=y/(height-1);
    const sx=(1-v)*((1-u)*tl[0]+u*tr[0])+v*((1-u)*bl[0]+u*br[0]);
    const sy=(1-v)*((1-u)*tl[1]+u*tr[1])+v*((1-u)*bl[1]+u*br[1]);
    const x0=Math.floor(sx), y0=Math.floor(sy), dx=sx-x0, dy=sy-y0;
    for(let c=0;c<3;c++) {
      const sample=(xx,yy)=>data[(yy*info.width+xx)*3+c];
      output[(y*width+x)*3+c]=Math.round(
        sample(x0,y0)*(1-dx)*(1-dy)+sample(x0+1,y0)*dx*(1-dy)
        +sample(x0,y0+1)*(1-dx)*dy+sample(x0+1,y0+1)*dx*dy);
    }
  }
  await sharp(output,{raw:{width,height,channels:3}}).webp({lossless:true})
    .toFile(resolve(destination,`photo-${name}.webp`));
}
console.log('Extracted six individual photographs from the supplied mockup.');
