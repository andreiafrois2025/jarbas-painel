"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Agent } from "@/lib/types";
import { recordExecution } from "@/lib/storage";

// =============================================
// PixiOffice — Escritório Pixel Art Detalhado
// PX=2 para alta resolução visual
// Estilo referência: escritório isométrico
// =============================================

interface PixiOfficeProps {
  agents: Agent[];
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

// === PIXEL SCALE ===
const PX = 2;

// === PALETTES ===
const HAIR = [
  ["#2C1810","#1A0E08"], ["#5C3317","#3D200E"], ["#8B4513","#6B3410"],
  ["#D4883E","#B07030"], ["#CC4422","#AA3318"], ["#1A1A2E","#0D0D17"],
  ["#6B2D5B","#4A1D3B"], ["#E0A040","#C08830"],
];
const SHIRTS = [
  ["#E84040","#C03030"], ["#4488CC","#336699"], ["#44AA44","#338833"],
  ["#9955CC","#7744AA"], ["#FF8800","#DD7700"], ["#EEEEEE","#CCCCCC"],
  ["#FF69B4","#DD5599"], ["#40CCCC","#30AAAA"], ["#FFD700","#DDBB00"],
  ["#6B8E23","#556B1C"],
];
const SKINS = [
  ["#FDDCB5","#E0C49D","#FFB5A0"],
  ["#F5D0A9","#D9B888","#F0A890"],
  ["#DBA97B","#BF9065","#D09068"],
  ["#C68642","#A87030","#B87838"],
  ["#8B6040","#704D30","#805838"],
];
const PANTS = [
  ["#2C2C44","#1E1E30"], ["#3C3C3C","#2A2A2A"],
  ["#483C28","#342A1C"], ["#1A1A1A","#0E0E0E"],
];

type Activity = "typing" | "coffee" | "reading" | "idle";

interface Style {
  skin: string[]; hair: string[]; shirt: string[]; pants: string[];
  isFemale: boolean; activity: Activity; hairStyle: number;
}

function getStyle(agent: Agent, idx: number): Style {
  const h = agent.name.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
  const isFemale = agent.gender === "female";
  const acts: Activity[] = ["typing","typing","coffee","reading","idle"];
  return {
    skin: SKINS[(h+idx) % SKINS.length],
    hair: HAIR[(h*3+idx) % HAIR.length],
    shirt: SHIRTS[(h*7+idx) % SHIRTS.length],
    pants: PANTS[(h*11) % PANTS.length],
    isFemale,
    activity: acts[(h+idx) % acts.length],
    hairStyle: isFemale ? h % 3 : h % 2,
  };
}

// === DRAW HELPER ===
let C: CanvasRenderingContext2D;
function p(x:number, y:number, w:number, h:number, c:string) {
  C.fillStyle = c;
  C.fillRect(Math.round(x*PX), Math.round(y*PX), Math.round(w*PX), Math.round(h*PX));
}

// === OFFICE BACKGROUND ===
function drawBg(w:number, h:number, wallH:number) {
  // Wall
  p(0,0,w,wallH,"#C8B8A0");
  // Wainscoting
  p(0,wallH-6,w,6,"#A09078");
  p(0,wallH-7,w,1,"#887060");
  // Baseboard
  p(0,wallH-1,w,1,"#6B5B43");

  // Floor tiles
  for (let fy=wallH; fy<h; fy+=6) {
    for (let fx=0; fx<w; fx+=6) {
      const light = ((fx/6+fy/6)%2===0);
      p(fx,fy,6,6,light?"#9494A4":"#8484948");
    }
  }
  // Carpet
  const cl=Math.round(w*0.06), cr=Math.round(w*0.94);
  const ct=wallH+2, cb=h-2;
  p(cl,ct,cr-cl,cb-ct,"#3C5C80");
  p(cl,ct,cr-cl,1,"#4C6C90");
  p(cl,cb-1,cr-cl,1,"#2C4C70");
  p(cl,ct,1,cb-ct,"#4C6C90");
  p(cr-1,ct,1,cb-ct,"#2C4C70");
  // Carpet pattern
  for (let cy=ct+4; cy<cb-4; cy+=8) {
    p(cl+3,cy,cr-cl-6,1,"#5656748");
  }
}

// === WALL DECORATIONS ===
function drawWindow(x:number, y:number) {
  // Frame
  p(x,y,18,20,"#6B5B43");
  p(x+1,y+1,16,18,"#87CEEB");
  // Cross bars
  p(x+8,y+1,2,18,"#6B5B43");
  p(x+1,y+9,16,2,"#6B5B43");
  // Sky shading
  p(x+1,y+1,7,4,"#6BAED6");
  p(x+10,y+1,7,4,"#6BAED6");
  // Clouds
  p(x+2,y+2,3,2,"#FFF"); p(x+3,y+1,2,1,"#FFF");
  p(x+12,y+4,3,2,"#FFF"); p(x+13,y+3,2,1,"#FFF");
  // Blinds
  for (let i=0;i<3;i++) {
    p(x+1,y+1+i*6,7,1,"#E8E0D0");
    p(x+10,y+1+i*6,7,1,"#E8E0D0");
  }
  // Sill
  p(x-1,y+20,20,2,"#7B6B53");
}

function drawPoster(x:number, y:number, text:string, bg:string) {
  p(x,y,16,12,"#333");
  p(x+1,y+1,14,10,bg);
  C.fillStyle = "#FFD700";
  C.font = `bold ${PX*3.5}px "Courier New",monospace`;
  C.textAlign = "center";
  C.textBaseline = "middle";
  C.fillText(text,(x+8)*PX,(y+6)*PX);
}

function drawClock(x:number, y:number, frame:number) {
  p(x,y,7,7,"#FFF");
  p(x,y,7,1,"#333"); p(x,y+6,7,1,"#333");
  p(x,y,1,7,"#333"); p(x+6,y,1,7,"#333");
  // Marks
  p(x+3,y+1,1,1,"#333"); p(x+3,y+5,1,1,"#333");
  p(x+1,y+3,1,1,"#333"); p(x+5,y+3,1,1,"#333");
  // Hands
  p(x+3,y+2,1,2,"#222");
  const m = frame%120;
  if (m<30) p(x+4,y+3,2,1,"#C00");
  else if (m<60) p(x+3,y+4,1,2,"#C00");
  else if (m<90) p(x+1,y+3,2,1,"#C00");
  else p(x+3,y+1,1,2,"#C00");
}

function drawCabinet(x:number, y:number) {
  p(x,y,9,24,"#8B8B70");
  p(x+1,y,7,1,"#9B9B80");
  for (let i=0;i<4;i++) {
    p(x+1,y+1+i*6,7,5,"#7B7B60");
    p(x+3,y+3+i*6,3,1,"#AAA");
  }
}

function drawBigPlant(x:number, y:number) {
  // Pot
  p(x+2,y+10,6,4,"#A0522D");
  p(x+1,y+10,8,1,"#8B4513");
  // Stem
  p(x+4,y+6,2,4,"#2E6B2E");
  // Leaves
  p(x,y+3,4,3,"#228B22"); p(x+1,y+2,3,1,"#2E8B2E");
  p(x+6,y+2,4,3,"#3CB043"); p(x+7,y+1,3,1,"#228B22");
  p(x+2,y,3,3,"#2E8B2E"); p(x+5,y+1,3,2,"#228B22");
  p(x+3,y-1,4,2,"#3CB043");
}

function drawSmallPlant(x:number, y:number) {
  p(x+1,y+4,3,3,"#8B6040");
  p(x,y+4,5,1,"#6B4030");
  p(x+1,y+2,3,2,"#228B22");
  p(x,y+1,2,2,"#2E8B2E");
  p(x+3,y,2,2,"#3CB043");
}

function drawCeilingLight(x:number,y:number) {
  p(x,y,16,2,"#DDD");
  p(x+1,y+2,14,1,"#FFF");
  p(x+3,y+3,10,1,"#FFFFFF");
}

function drawWaterCooler(x:number,y:number,frame:number) {
  // Body
  p(x,y+4,6,10,"#D0D0E0");
  p(x+1,y+4,4,1,"#E0E0F0");
  // Water bottle on top
  p(x+1,y,4,5,"#B0D0FF");
  p(x+2,y-1,2,1,"#90B0DD");
  // Tap
  p(x+5,y+7,2,1,"#888");
  // Drip
  if (frame%40<5) p(x+5,y+8,1,1,"#80C0FF");
  // Legs
  p(x,y+14,2,2,"#999"); p(x+4,y+14,2,2,"#999");
}

// === MONITOR ===
function drawMonitor(x:number, y:number, frame:number) {
  // Monitor body
  p(x,y,13,10,"#444");
  p(x+1,y+1,11,8,"#333");
  // Screen
  p(x+2,y+2,9,6,"#0a2a4a");
  // Content lines
  for (let i=0;i<4;i++) {
    const lw = 2+((frame+i*5)%4);
    p(x+3,y+3+i*1.2,lw,1, i===0?"#6ac":"#4a8aaa");
  }
  // Cursor blink
  if (frame%24<12) p(x+8,y+6,1,1,"#FFF");
  // Stand
  p(x+4,y+10,5,2,"#555");
  p(x+3,y+12,7,1,"#666");
}

// === KEYBOARD ===
function drawKeyboard(x:number, y:number, typing:boolean, frame:number) {
  p(x,y,10,3,"#DDD");
  p(x,y,10,1,"#EEE");
  // Keys
  for (let r=0;r<2;r++) for (let c=0;c<4;c++) {
    const hit = typing && frame%8<4 && ((r===0&&c===frame%4)||(r===1&&c===(frame+2)%4));
    p(x+1+c*2, y+r+1, 1, 1, hit?"#999":"#CCC");
  }
}

// === CHARACTER DRAWING ===
function drawHead(x:number, y:number, sk:string[], frame:number) {
  const [base,shadow,blush] = sk;
  // Head oval
  p(x+2,y,7,1,base);
  p(x+1,y+1,9,1,base);
  p(x,y+2,11,6,base);
  p(x+1,y+8,9,1,base);
  p(x+2,y+9,7,1,base);
  // Ears
  p(x-1,y+3,1,3,base); p(x+11,y+3,1,3,base);
  p(x-1,y+4,1,1,shadow); p(x+11,y+4,1,1,shadow);
  // Eyes
  const blink = frame%70<2;
  if (blink) {
    p(x+2,y+4,3,1,"#222"); p(x+7,y+4,3,1,"#222");
  } else {
    p(x+2,y+3,3,2,"#FFF"); p(x+7,y+3,3,2,"#FFF");
    const lk = frame%100<50?0:1;
    p(x+3+lk,y+3,1,2,"#1A1A2E"); p(x+8+lk,y+3,1,2,"#1A1A2E");
    p(x+3+lk,y+3,1,1,"#333366");
  }
  // Eyebrows
  p(x+2,y+2,3,1,"#3C2A1A"); p(x+7,y+2,3,1,"#3C2A1A");
  // Nose
  p(x+5,y+5,2,2,shadow); p(x+5,y+6,1,1,base);
  // Mouth
  if (frame%200<100) {
    p(x+4,y+7,4,1,"#CC7766"); p(x+5,y+8,2,1,shadow);
  } else {
    p(x+4,y+7,4,1,"#CC8877");
  }
  // Blush
  p(x+1,y+5,1,1,blush); p(x+9,y+5,1,1,blush);
}

function drawHairM0(x:number,y:number,c:string[]) {
  // Short male
  p(x+1,y-2,9,2,c[0]);
  p(x,y,11,2,c[0]);
  p(x,y,2,4,c[0]); p(x+9,y,2,4,c[0]);
  p(x+3,y-2,3,1,c[1]);
}
function drawHairM1(x:number,y:number,c:string[]) {
  // Medium male
  p(x,y-3,11,3,c[0]);
  p(x-1,y,13,2,c[0]);
  p(x-1,y,2,5,c[0]); p(x+10,y,2,5,c[0]);
  p(x+3,y-3,4,1,c[1]);
}
function drawHairF0(x:number,y:number,c:string[]) {
  // Bob female
  p(x,y-3,11,3,c[0]);
  p(x-1,y,13,3,c[0]);
  p(x-2,y+2,3,7,c[0]); p(x+10,y+2,3,7,c[0]);
  p(x-1,y+8,2,2,c[0]); p(x+10,y+8,2,2,c[0]);
  p(x+3,y-3,4,1,c[1]);
}
function drawHairF1(x:number,y:number,c:string[]) {
  // Ponytail female
  p(x+1,y-3,9,3,c[0]);
  p(x,y,11,2,c[0]);
  p(x-1,y+1,2,4,c[0]); p(x+10,y+1,2,4,c[0]);
  // Ponytail
  p(x+9,y-4,4,3,c[0]);
  p(x+11,y-2,3,5,c[0]);
  p(x+12,y+2,2,4,c[0]);
  p(x+3,y-3,3,1,c[1]);
}
function drawHairF2(x:number,y:number,c:string[]) {
  // Long female
  p(x,y-3,11,3,c[0]);
  p(x-1,y,13,3,c[0]);
  p(x-2,y+2,3,13,c[0]); p(x+10,y+2,3,13,c[0]);
  p(x-2,y+13,2,3,c[0]); p(x+11,y+13,2,3,c[0]);
  p(x+3,y-3,3,1,c[1]);
}

function drawTorso(x:number,y:number,sh:string[],isFemale:boolean) {
  // Neck
  p(x+4,y,3,2,SKINS[0][0]);
  // Shoulders
  p(x,y+2,11,2,sh[0]);
  p(x-1,y+4,13,8,sh[0]);
  // Collar
  p(x+3,y+2,5,2,"#FFF");
  p(x+5,y+2,1,3,sh[1]);
  // Shadow folds
  p(x+4,y+5,1,6,sh[1]); p(x+7,y+5,1,6,sh[1]);
  // Bottom
  p(x-1,y+11,13,1,sh[1]);
  if (isFemale) {
    p(x-1,y+10,1,2,sh[1]); p(x+11,y+10,1,2,sh[1]);
  }
}

function drawArmsTyping(x:number,y:number,sk:string[],sh:string[],f:number) {
  const t = f%16<8?0:1;
  // Left sleeve + arm
  p(x-3,y+4,3,3,sh[0]); p(x-4,y+6,3,4+t,sh[1]);
  p(x-4,y+9+t,3,2,sk[0]);
  // Right
  p(x+11,y+4,3,3,sh[0]); p(x+12,y+6,3,4-t,sh[1]);
  p(x+12,y+9-t,3,2,sk[0]);
}

function drawArmsIdle(x:number,y:number,sk:string[],sh:string[],f:number) {
  const b = f%40<20?0:1;
  p(x-3,y+4,3,7+b,sh[0]); p(x-3,y+10+b,3,2,sk[0]);
  p(x+11,y+4,3,5,sh[0]); p(x+12,y+8,2,2,sk[0]);
}

function drawArmsCoffee(x:number,y:number,sk:string[],sh:string[],f:number) {
  const sip = f%80<15;
  p(x-3,y+4,3,7,sh[0]); p(x-3,y+10,3,2,sk[0]);
  if (sip) {
    p(x+11,y+2,3,3,sh[0]); p(x+12,y,2,3,sk[0]);
    // Mug near face
    p(x+11,y-2,4,3,"#8B4513"); p(x+12,y-2,2,1,"#DDD");
    if (f%6<3) { p(x+12,y-4,1,1,"#CCC"); p(x+13,y-5,1,1,"#AAA"); }
  } else {
    p(x+11,y+4,3,7,sh[0]); p(x+12,y+10,2,2,sk[0]);
  }
}

function drawArmsReading(x:number,y:number,sk:string[],sh:string[],f:number) {
  // Both arms holding paper
  p(x-3,y+4,3,4,sh[0]); p(x-3,y+7,2,3,sk[0]);
  p(x+11,y+4,3,4,sh[0]); p(x+12,y+7,2,3,sk[0]);
  // Paper
  p(x-1,y+4,13,8,"#FFF");
  p(x,y+5,4,1,"#AAA"); p(x,y+7,6,1,"#AAA"); p(x,y+9,3,1,"#AAA");
}

// === DESK ===
function drawDesk(x:number, y:number, w:number) {
  // Top surface (3D)
  p(x,y,w,2,"#D4B896");
  p(x+1,y,w-2,1,"#E0C8A8");
  // Front panel
  p(x,y+2,w,8,"#8B7355");
  p(x+1,y+2,w-2,1,"#9C8466");
  // Drawer lines
  p(x+2,y+4,w-4,1,"#7A6448");
  p(x+2,y+7,w-4,1,"#7A6448");
  // Handles
  p(x+w/2-1,y+5,3,1,"#BBB");
  p(x+w/2-1,y+8,3,1,"#BBB");
  // Legs
  p(x+1,y+10,2,3,"#6B5B43");
  p(x+w-3,y+10,2,3,"#6B5B43");
}

// === CHAIR ===
function drawChair(x:number, y:number) {
  // Back
  p(x,y,12,2,"#555");
  p(x+1,y-1,10,1,"#666");
  // Back padding
  p(x+1,y+2,10,10,"#3a3a50");
  p(x+2,y+2,8,1,"#4a4a60");
  // Armrests
  p(x-1,y+8,2,4,"#555");
  p(x+11,y+8,2,4,"#555");
}

// === DESK ITEMS ===
function drawCoffeeMug(x:number,y:number,f:number) {
  p(x,y,3,3,"#8B4513"); p(x+3,y+1,1,1,"#8B4513");
  p(x,y,3,1,"#3C1A00");
  if (f%10<5) p(x+1,y-1,1,1,"#DDD");
  if (f%10>=5) { p(x,y-2,1,1,"#CCC"); p(x+2,y-1,1,1,"#DDD"); }
}

function drawPapers(x:number,y:number) {
  p(x+1,y,5,6,"#F8F8F0"); p(x,y,5,6,"#FFF");
  p(x+1,y+1,3,1,"#AAA"); p(x+1,y+3,2,1,"#AAA");
}

function drawPenHolder(x:number,y:number) {
  p(x,y+1,3,3,"#666"); p(x,y+1,3,1,"#777");
  p(x,y-1,1,2,"#22A"); p(x+1,y,1,1,"#C22"); p(x+2,y-2,1,3,"#2A2");
}

// === FULL STATION (CHARACTER + DESK) ===
function drawStation(
  x:number, y:number, agent:Agent, style:Style, frame:number, hovered:boolean
) {
  const dW = 40;
  const dY = y + 14;
  const cx = x + dW/2 - 5;
  const headY = y - 2;

  // Chair
  drawChair(cx-1, headY-3);

  // Character head
  drawHead(cx, headY, style.skin, frame);

  // Hair
  if (style.isFemale) {
    [drawHairF0,drawHairF1,drawHairF2][style.hairStyle](cx,headY,style.hair);
  } else {
    [drawHairM0,drawHairM1][style.hairStyle](cx,headY,style.hair);
  }

  // Torso
  drawTorso(cx, headY+10, style.shirt, style.isFemale);

  // Arms
  if (style.activity==="typing") drawArmsTyping(cx,headY+10,style.skin,style.shirt,frame);
  else if (style.activity==="coffee") drawArmsCoffee(cx,headY+10,style.skin,style.shirt,frame);
  else if (style.activity==="reading") drawArmsReading(cx,headY+10,style.skin,style.shirt,frame);
  else drawArmsIdle(cx,headY+10,style.skin,style.shirt,frame);

  // Desk
  drawDesk(x, dY, dW);

  // Monitor
  if (style.activity!=="reading") drawMonitor(x+dW/2-6, dY-12, frame);

  // Keyboard
  if (style.activity==="typing") drawKeyboard(x+dW/2-5, dY-1, true, frame);
  else if (style.activity!=="reading") drawKeyboard(x+dW/2-5, dY-1, false, frame);

  // Desk items
  const h = agent.name.charCodeAt(0);
  if (h%3===0) drawCoffeeMug(x+1, dY-3, frame);
  if (h%4===0) drawPapers(x+dW-7, dY-6);
  if (h%5===0) drawPenHolder(x+dW-5, dY-3);

  // === Nameplate on desk (tool name) — kept on canvas ===
  const toolName = agent.name;
  const maxChars = 12;
  const dispTool = toolName.length>maxChars ? toolName.slice(0,maxChars-1)+"…" : toolName;
  const nW = dispTool.length*2.5+4;
  const nX = x+dW/2-nW/2;
  p(nX, dY+2, nW, 4, "#2C2C44");
  C.fillStyle="#FFF";
  C.font=`bold ${PX*2.2}px "Courier New",monospace`;
  C.textAlign="center"; C.textBaseline="middle";
  C.fillText(dispTool, (x+dW/2)*PX, (dY+4)*PX);

  // Status dot (green = active)
  p(x+dW-2, dY-13, 2, 2, "#44CC44");

  // Hover glow
  if (hovered) {
    C.strokeStyle="#FFD700";
    C.lineWidth=2;
    C.strokeRect((x-1)*PX,(headY-10)*PX,(dW+2)*PX,(dY+15-headY+10)*PX);
  }
}

// === COMPONENT ===
export default function PixiOffice({ agents, onEdit, onDelete }: PixiOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const [hovered, setHovered] = useState<string|null>(null);

  const cols = Math.min(agents.length, 5);
  const rows = Math.ceil(agents.length / 5) || 1;
  const stW = 52;
  const stH = 64;
  const cW = Math.max(260, 16 + cols * stW);
  const wallH = Math.round(cW * 0.13) + 30;
  const cH = wallH + 12 + rows * stH + 24;

  const styles = agents.map((a,i) => getStyle(a,i));

  const positions = agents.map((_,i) => {
    const row = Math.floor(i/5);
    const col = i%5;
    const total = Math.min(5, agents.length-row*5);
    const sx = (cW - total*stW)/2;
    return { x: sx+col*stW+4, y: wallH+14+row*stH };
  });

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    C = ctx;
    ctx.imageSmoothingEnabled = false;
    const f = frameRef.current;

    ctx.clearRect(0,0,cv.width,cv.height);

    // Background
    drawBg(cW, cH, wallH);

    // Wall decorations
    const wCount = Math.max(2, Math.min(4, Math.floor(cW/70)));
    const wSpacing = cW/(wCount+1);
    for (let i=0;i<wCount;i++) drawWindow(wSpacing*(i+1)-9, 2);

    // Posters
    if (cW>200) {
      drawPoster(4, 4, "WORK", "#1a3a5c");
      drawPoster(cW-20, 4, "GO!", "#2C1810");
    }

    // Clock
    drawClock(Math.round(cW/2)-3, 1, f);

    // Ceiling lights
    drawCeilingLight(Math.round(cW*0.25)-8, 0);
    if (cW>200) drawCeilingLight(Math.round(cW*0.75)-8, 0);

    // Side furniture
    drawCabinet(1, wallH-22);
    drawCabinet(cW-10, wallH-22);

    // Plants
    drawBigPlant(12, wallH-14);
    drawSmallPlant(cW-18, wallH-6);

    // Water cooler
    drawWaterCooler(cW-20, wallH-14, f);

    // Stations
    agents.forEach((agent,i) => {
      const pos = positions[i];
      if (pos) drawStation(pos.x, pos.y, agent, styles[i], f, hovered===agent.id);
    });

    frameRef.current++;
  }, [agents, cW, cH, wallH, hovered, positions, styles]);

  useEffect(() => {
    let id: number;
    let last = 0;
    const interval = 1000/10; // 10 FPS pixel art
    function loop(t: number) {
      if (t-last>=interval) { render(); last=t; }
      id = requestAnimationFrame(loop);
    }
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [render]);

  // Mouse
  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const sx = cv.width/r.width, sy = cv.height/r.height;
    const mx = (e.clientX-r.left)*sx/PX;
    const my = (e.clientY-r.top)*sy/PX;
    let foundAgent: Agent|undefined;
    for (let i=0; i<positions.length; i++) {
      const pos = positions[i];
      if (mx>=pos.x-2 && mx<=pos.x+stW && my>=pos.y-8 && my<=pos.y+stH-4) {
        foundAgent = agents[i];
      }
    }
    if (foundAgent) {
      setHovered(foundAgent.id);
    } else { setHovered(null); }
  }, [agents, positions]);

  // Click no canvas — abre link do agente hovered (se não tem sub_links)
  const onClick = useCallback(() => {
    if (!hovered) return;
    const agent = agents.find(a => a.id === hovered);
    if (!agent) return;
    const hasSubLinks = agent.sub_links && agent.sub_links.length > 0;
    if (!hasSubLinks && agent.link) {
      window.open(agent.link, "_blank");
      recordExecution(agent.id);
    }
  }, [hovered, agents]);

  const onCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!hovered) return;
    const agent = agents.find(a => a.id === hovered);
    if (agent) onEdit(agent);
  }, [hovered, agents, onEdit]);

  if (agents.length===0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p>Sala vazia — adicione agentes para popular o escritório</p>
      </div>
    );
  }

  // Calcular posições em % para os overlays HTML
  const canvasW = cW * PX;
  const canvasH = cH * PX;

  return (
    <div className="relative" style={{imageRendering:"pixelated"}}>
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        onMouseMove={onMove}
        onMouseLeave={() => setHovered(null)}
        onClick={onClick}
        onContextMenu={onCtx}
        style={{
          width:"100%",
          imageRendering:"pixelated",
          cursor:hovered?"pointer":"default",
          borderRadius:4,
        }}
      />

      {/* === HTML OVERLAYS: nome acima da cabeça + função abaixo da mesa === */}
      {agents.map((agent, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const dW = 40;
        const dY = pos.y + 14;
        const headY = pos.y - 2;

        // Converter coordenadas do canvas para % do container
        const centerX = ((pos.x + dW / 2) * PX / canvasW) * 100;
        const nameY = ((headY - 8) * PX / canvasH) * 100;
        const descY = ((dY + 8) * PX / canvasH) * 100;
        const subLinksY = ((dY + 14) * PX / canvasH) * 100;

        const agentDisplayName = agent.agent_name || agent.name;
        const isHovered = hovered === agent.id;
        const hasSubLinks = agent.sub_links && agent.sub_links.length > 0;

        return (
          <div key={agent.id}>
            {/* Nome acima da cabeça — sempre visível */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${centerX}%`,
                top: `${nameY}%`,
                transform: "translateX(-50%)",
              }}
            >
              <span className="text-[11px] md:text-sm font-bold text-white whitespace-nowrap"
                style={{textShadow:"1px 1px 2px #000, -1px 1px 2px #000, 0 0 4px #000"}}>
                {agentDisplayName}
              </span>
            </div>

            {/* Função/descrição abaixo da mesa */}
            {agent.description && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${centerX}%`,
                  top: `${descY}%`,
                  transform: "translateX(-50%)",
                  maxWidth: `${(dW * PX / canvasW) * 120}%`,
                }}
              >
                <span className="text-[9px] md:text-[11px] text-white whitespace-normal text-center block leading-tight"
                  style={{textShadow:"1px 1px 2px #000, -1px 1px 2px #000, 0 0 3px #000"}}>
                  {agent.description}
                </span>
              </div>
            )}

            {/* Sub-links — botões clicáveis abaixo da função */}
            {hasSubLinks && (
              <div
                className="absolute flex gap-0.5 flex-wrap justify-center"
                style={{
                  left: `${centerX}%`,
                  top: `${subLinksY}%`,
                  transform: "translateX(-50%)",
                  maxWidth: `${(dW * PX / canvasW) * 150}%`,
                }}
              >
                {agent.sub_links!.map((sl, si) => (
                  <button
                    key={si}
                    onClick={(e) => { e.stopPropagation(); window.open(sl.url, "_blank"); recordExecution(agent.id); }}
                    className="text-[8px] md:text-[10px] bg-blue-700/90 hover:bg-blue-500 text-white px-1.5 py-0.5 rounded cursor-pointer transition-all whitespace-nowrap"
                    style={{textShadow:"1px 1px 1px #000"}}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>
            )}

            {/* Hover: botões Editar/Excluir */}
            {isHovered && (
              <div
                className="absolute flex items-center gap-1 z-50"
                style={{
                  left: `${centerX}%`,
                  top: `${nameY - 5}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <button
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer text-sm md:text-base transition-all hover:scale-110 shadow-lg"
                  title="Editar"
                  onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
                >✏️</button>
                <button
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer text-sm md:text-base transition-all hover:scale-110 shadow-lg"
                  title="Excluir"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir ${agentDisplayName}?`)) onDelete(agent.id); }}
                >🗑️</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Tooltip antigo removido — agora os botões ficam diretamente sobre o agente */}
    </div>
  );
}
