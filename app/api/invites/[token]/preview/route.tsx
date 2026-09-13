import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getInvitePreview } from "@/lib/public-museum";
export const dynamic = "force-dynamic";
const font = readFile(join(process.cwd(), "public/fonts/InstrumentSerif-Regular.ttf"));
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
 const { token } = await params; const invite = await getInvitePreview(token);
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#17120d",backgroundImage:"radial-gradient(ellipse at 80% 65%, #593d1d, #17120d 65%)",color:"#eddbc0",padding:65,fontFamily:"Display"}}>
 <div style={{display:"flex",justifyContent:"space-between",fontSize:18,fontFamily:"sans-serif",letterSpacing:4,textTransform:"uppercase",color:"#b99c71"}}><span>Museum of Me</span><span>A private invitation</span></div>
 <div style={{display:"flex",flexDirection:"column",gap:20}}><div style={{display:"flex",fontSize:invite.name.length>35?65:90,lineHeight:1,maxHeight:205,overflow:"hidden",wordBreak:"break-word"}}>{invite.exists?`A little thing. A lot of ${invite.name}.`:"A world made of little things."}</div><div style={{display:"flex",fontSize:30,color:"#c5a676"}}>{invite.exists?"What reminds you of them? Give it a place in their museum.":"A portrait only your friends could make."}</div></div>
 <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #bb945544",paddingTop:23,fontFamily:"sans-serif",fontSize:16,color:"#b99c71"}}><span>{invite.closed?"The museum is now open":"One friend. One memory."}</span><span>{invite.exists?"You have a place in this story.":"Museum of Me"}</span></div>
 </div>,{width:1200,height:630,fonts:[{name:"Display",data:await font,weight:400,style:"normal"}],headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow, noarchive"}});
}

