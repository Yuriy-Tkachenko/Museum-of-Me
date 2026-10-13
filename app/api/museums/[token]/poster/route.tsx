/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublicMuseum } from "@/lib/public-museum";
import { posterImage } from "@/lib/media";
import { rateLimit, securityError } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const font = readFile(join(process.cwd(), "public/fonts/InstrumentSerif-Regular.ttf"));
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
 try {
  const { token } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "story";
  if (!["story", "square", "og"].includes(format)) return NextResponse.json({ error: "Unknown poster format" }, { status: 400 });
  await rateLimit("posters-global", "all", 120, 60);
  const museum = await getPublicMuseum(token);
  if (!museum.exists) return NextResponse.json({ error: "Museum not found" }, { status: 404 });
  const landscape = format === "og", story = format === "story";
  const width = landscape ? 1200 : 1080, height = story ? 1920 : landscape ? 630 : 1080;
  const exhibits = museum.unlocked ? museum.exhibits.slice(0, 4) : [];
  const photos = await Promise.all(exhibits.map((exhibit) => posterImage(exhibit.imageUrl)));
  const cardWidth = story ? 330 : landscape ? 215 : 250;
  const cardHeight = story ? 350 : landscape ? 168 : 238;
  const centerY = story ? 970 : landscape ? 320 : 550;
  const positions = story ? [[65,470,-8],[685,390,8],[50,1120,6],[685,1210,-7]] : landscape ? [[40,155,-7],[935,120,7],[70,370,6],[905,365,-6]] : [[45,240,-8],[765,195,8],[65,675,6],[740,670,-7]];
  const nameSize = museum.name.length > 25 ? (landscape ? 53 : 70) : landscape ? 90 : story ? 140 : 110;
  const generated = new ImageResponse(<div style={{ display:"flex",position:"relative",width:"100%",height:"100%",background:"#f3efe6",backgroundImage:"radial-gradient(ellipse at 50% 55%, #eadac5 0%, #f1e9dd 42%, #f3efe6 80%)",color:"#292b25",fontFamily:"Display",overflow:"hidden" }}>
   <div style={{display:"flex",position:"absolute",top:story?85:40,left:55,right:55,justifyContent:"space-between",fontFamily:"sans-serif",fontSize:landscape?14:19,color:"#a4492e",letterSpacing:3,textTransform:"uppercase"}}><span>Museum of Me</span><span>{museum.unlocked?"Through the eyes of friends":"A collection in the making"}</span></div>
   <div style={{display:"flex",position:"absolute",left:width/2-(landscape?245:365),top:centerY-(landscape?140:250),width:landscape?490:730,height:landscape?280:500,border:"1px solid #a99b7e38",borderRadius:"50%",transform:"rotate(-14deg)"}} />
   <div style={{display:"flex",position:"absolute",left:width/2-(landscape?195:260),top:centerY-(landscape?180:330),width:landscape?390:520,height:landscape?360:660,border:"1px solid #a99b7e23",borderRadius:"50%",transform:"rotate(28deg)"}} />
   <div style={{display:"flex",position:"absolute",left:width/2-(landscape?220:290),top:centerY-(story?125:95),width:landscape?440:580,flexDirection:"column",alignItems:"center",textAlign:"center"}}>
    <span style={{fontFamily:"sans-serif",fontSize:landscape?11:17,letterSpacing:5,color:"#a4492e"}}>A WORLD OF</span>
    <div style={{display:"flex",maxHeight:story?300:180,overflow:"hidden",fontSize:nameSize,lineHeight:1.05,marginTop:15,wordBreak:"break-word"}}>{museum.name}</div>
    <span style={{fontFamily:"sans-serif",fontSize:landscape?12:17,marginTop:22,color:"#74746a"}}>{museum.unlocked?`${museum.exhibits.length} memories. One extraordinary person.`:"A few little surprises, still to come."}</span>
   </div>
   {positions.map(([left,top,angle],index) => {
    const exhibit=exhibits[index],photo=photos[index];
    return <div key={index} style={{display:"flex",position:"absolute",left,top,width:cardWidth,height:cardHeight,padding:9,flexDirection:"column",background:"#fffdf7",border:"1px solid #d8d3c7",transform:`rotate(${angle}deg)`,boxShadow:"0 15px 35px #493a2420"}}>
     {photo?<img src={photo} alt="" width={cardWidth-20} height={cardHeight-67} style={{objectFit:"cover"}}/>:<div style={{display:"flex",width:"100%",height:cardHeight-67,background:"#e9e3d5",alignItems:"center",justifyContent:"center",fontSize:story?100:70,color:"#a4492e"}}>{exhibit?"*":"+"}</div>}
     <div style={{display:"flex",marginTop:10,gap:8,alignItems:"baseline",maxHeight:40,overflow:"hidden"}}><span style={{fontSize:10,fontFamily:"sans-serif",color:"#a4492e"}}>{String(index+1).padStart(2,"0")}</span><span style={{fontSize:landscape?22:28,lineHeight:1.1}}>{exhibit?.title??(museum.unlocked?"Made of little things":"Still a secret")}</span></div>
    </div>;
   })}
   <div style={{display:"flex",position:"absolute",bottom:story?100:40,left:40,right:40,flexDirection:"column",alignItems:"center",textAlign:"center"}}>
    <span style={{fontSize:story?64:landscape?31:46}}>You are a thousand little things.</span><span style={{fontSize:landscape?11:15,fontFamily:"sans-serif",color:"#74746a",letterSpacing:3,marginTop:17}}>A PORTRAIT ONLY YOUR FRIENDS COULD MAKE</span>
   </div>
  </div>,{width,height,fonts:[{name:"Display",data:await font,weight:400,style:"normal"}]});
  return new Response(await generated.arrayBuffer(),{headers:{"Content-Type":"image/png","Cache-Control":"no-store"}});
 } catch(error){ return securityError(error); }
}

