"use client";

import { Agent } from "@/lib/types";
import { recordExecution } from "@/lib/storage";

// =============================================
// OfficeScene — Escritório isométrico com personagens animados
// Visão de cima/lado, mobília, agentes em atividades diversas
// =============================================

interface OfficeSceneProps {
  agents: Agent[];
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

// Posições das mesas no grid isométrico (x, y relativo ao viewBox)
const DESK_POSITIONS = [
  { x: 100, y: 200 },
  { x: 300, y: 200 },
  { x: 500, y: 200 },
  { x: 700, y: 200 },
  { x: 100, y: 360 },
  { x: 300, y: 360 },
  { x: 500, y: 360 },
  { x: 700, y: 360 },
  { x: 200, y: 280 },
  { x: 400, y: 280 },
  { x: 600, y: 280 },
  { x: 800, y: 280 },
];

type Activity = "typing" | "coffee" | "thinking" | "reading";

const HAIR_COLORS = ["#2C1810", "#1a1a2e", "#5C3317", "#8B6914", "#A0522D", "#4A2800", "#6B2D5B", "#D4A03C", "#C0392B", "#E08040"];
const SHIRT_COLORS = ["#E74C3C", "#4A90D9", "#2ECC71", "#9B59B6", "#F39C12", "#1ABC9C", "#E67E22", "#5DADE2", "#FF6B9D", "#48C9B0"];
const SKIN_TONES = ["#FDDCB5", "#F5D0A9", "#EDCAA8", "#DBA97B", "#C68642", "#A0724A"];
const PANT_COLORS = ["#2C3E50", "#1a1a3e", "#34495E", "#2E2E4E", "#3C3C5C"];

function getCharStyle(agent: Agent) {
  const hash = agent.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const activities: Activity[] = ["typing", "coffee", "thinking", "reading"];

  return {
    hair: HAIR_COLORS[agent.hair_color ?? (hash % HAIR_COLORS.length)],
    shirt: SHIRT_COLORS[agent.shirt_color ?? (hash % SHIRT_COLORS.length)],
    skin: SKIN_TONES[agent.skin_tone ?? (hash % SKIN_TONES.length)],
    pants: PANT_COLORS[hash % PANT_COLORS.length],
    isFemale: (agent.gender || "male") === "female",
    activity: activities[hash % activities.length],
    hasGlasses: agent.has_glasses ?? (hash % 5 === 0),
  };
}

// Isometric floor tile
function FloorTile({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <rect x={x} y={y} width={w} height={h} fill={color} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
  );
}

// Wall with windows, whiteboard, clock
function OfficeWalls() {
  return (
    <g>
      {/* Back wall */}
      <rect x="0" y="40" width="900" height="110" fill="#B8C4D0" />
      <rect x="0" y="40" width="900" height="4" fill="#8090A0" />
      {/* Wall trim */}
      <rect x="0" y="146" width="900" height="4" fill="#909EAA" />

      {/* Windows */}
      {[80, 310, 540, 770].map((wx, i) => (
        <g key={`win-${i}`}>
          <rect x={wx} y="55" width="110" height="75" rx="2" fill="#4A6FA5" stroke="#7A8A96" strokeWidth="2" />
          <rect x={wx + 3} y="58" width="104" height="69" rx="1" fill="#87CEEB" />
          {/* Sky gradient */}
          <rect x={wx + 3} y="58" width="104" height="35" fill="#A8D8F0" opacity="0.6" />
          {/* Window frame cross */}
          <line x1={wx + 55} y1="58" x2={wx + 55} y2="127" stroke="#7A8A96" strokeWidth="2" />
          <line x1={wx + 3} y1="92" x2={wx + 107} y2="92" stroke="#7A8A96" strokeWidth="2" />
          {/* Curtain hints */}
          <rect x={wx} y="55" width="12" height="75" fill="rgba(200,180,160,0.3)" />
          <rect x={wx + 98} y="55" width="12" height="75" fill="rgba(200,180,160,0.3)" />
        </g>
      ))}

      {/* Whiteboard */}
      <rect x="220" y="58" width="75" height="55" rx="2" fill="#F8F8F0" stroke="#888" strokeWidth="1.5" />
      <rect x="224" y="62" width="67" height="47" fill="#FFFFF0" />
      {/* Scribbles on whiteboard */}
      <path d="M230,72 Q240,68 250,74" fill="none" stroke="#E74C3C" strokeWidth="1.5" opacity="0.6" />
      <path d="M230,80 L265,80" fill="none" stroke="#4A90D9" strokeWidth="1" opacity="0.5" />
      <path d="M230,86 L255,86" fill="none" stroke="#4A90D9" strokeWidth="1" opacity="0.5" />
      <path d="M230,92 L260,92" fill="none" stroke="#2ECC71" strokeWidth="1" opacity="0.5" />
      <rect x="270" y="66" width="15" height="18" rx="1" fill="#FFF3B0" />
      <line x1="272" y1="70" x2="283" y2="70" stroke="#999" strokeWidth="0.5" />
      <line x1="272" y1="74" x2="281" y2="74" stroke="#999" strokeWidth="0.5" />

      {/* Clock */}
      <circle cx="680" cy="82" r="18" fill="#FFF" stroke="#555" strokeWidth="2" />
      <circle cx="680" cy="82" r="15" fill="#FFFFF0" />
      {/* Clock hands */}
      <line x1="680" y1="82" x2="680" y2="71" stroke="#333" strokeWidth="1.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 680 82" to="360 680 82" dur="60s" repeatCount="indefinite" />
      </line>
      <line x1="680" y1="82" x2="690" y2="82" stroke="#333" strokeWidth="1" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 680 82" to="360 680 82" dur="3600s" repeatCount="indefinite" />
      </line>
      <circle cx="680" cy="82" r="2" fill="#333" />
      {/* Clock numbers */}
      <text x="680" y="72" textAnchor="middle" fontSize="5" fill="#555">12</text>
      <text x="692" y="84" textAnchor="middle" fontSize="5" fill="#555">3</text>
      <text x="680" y="96" textAnchor="middle" fontSize="5" fill="#555">6</text>
      <text x="668" y="84" textAnchor="middle" fontSize="5" fill="#555">9</text>
    </g>
  );
}

// Bookshelf/Cabinet against wall
function Cabinet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="50" height="70" rx="2" fill="#8B6914" stroke="#6B4E0E" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="46" height="16" fill="#A07818" />
      <rect x={x + 2} y={y + 20} width="46" height="16" fill="#A07818" />
      <rect x={x + 2} y={y + 38} width="46" height="16" fill="#A07818" />
      <rect x={x + 2} y={y + 56} width="46" height="12" fill="#A07818" />
      {/* Books/folders */}
      <rect x={x + 5} y={y + 4} width="6" height="12" fill="#E74C3C" rx="1" />
      <rect x={x + 13} y={y + 4} width="6" height="12" fill="#4A90D9" rx="1" />
      <rect x={x + 21} y={y + 4} width="8" height="12" fill="#2ECC71" rx="1" />
      <rect x={x + 31} y={y + 6} width="5" height="10" fill="#F39C12" rx="1" />
      <rect x={x + 38} y={y + 4} width="7" height="12" fill="#9B59B6" rx="1" />
      {/* Second shelf */}
      <rect x={x + 4} y={y + 22} width="10" height="12" fill="#5DADE2" rx="1" />
      <rect x={x + 16} y={y + 24} width="8" height="10" fill="#E67E22" rx="1" />
      <rect x={x + 26} y={y + 22} width="6" height="12" fill="#1ABC9C" rx="1" />
      <rect x={x + 35} y={y + 23} width="10" height="11" fill="#FF6B9D" rx="1" />
      {/* Third shelf */}
      <rect x={x + 5} y={y + 40} width="15" height="12" fill="#48C9B0" rx="1" />
      <rect x={x + 22} y={y + 42} width="8" height="10" fill="#C0392B" rx="1" />
      <rect x={x + 33} y={y + 40} width="12" height="12" fill="#7c5cfc" rx="1" />
    </g>
  );
}

// Printer
function Printer({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Printer table */}
      <rect x={x - 5} y={y + 30} width="60" height="5" rx="1" fill="#A0A0A0" />
      <rect x={x} y={y + 35} width="4" height="20" fill="#808080" />
      <rect x={x + 46} y={y + 35} width="4" height="20" fill="#808080" />
      {/* Printer body */}
      <rect x={x} y={y} width="50" height="30" rx="3" fill="#E0E0E0" stroke="#999" strokeWidth="1" />
      <rect x={x + 5} y={y + 3} width="40" height="8" rx="1" fill="#333" />
      {/* Paper tray */}
      <rect x={x + 10} y={y + 14} width="30" height="12" rx="1" fill="#F5F5F0" stroke="#CCC" strokeWidth="0.5" />
      {/* Status LED */}
      <circle cx={x + 43} cy={y + 25} r="2" fill="#34d399">
        <animate attributeName="opacity" values="1;0.4;1" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Paper coming out */}
      <rect x={x + 12} y={y - 5} width="26" height="8" fill="#FFF" stroke="#DDD" strokeWidth="0.5">
        <animate attributeName="y" values={`${y - 5};${y - 8};${y - 5}`} dur="4s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

// Water cooler
function WaterCooler({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Base */}
      <rect x={x} y={y + 40} width="30" height="25" rx="2" fill="#E8E8E8" stroke="#CCC" strokeWidth="1" />
      {/* Body */}
      <rect x={x + 3} y={y + 15} width="24" height="28" rx="2" fill="#F0F0F0" stroke="#BBB" strokeWidth="1" />
      {/* Water jug */}
      <ellipse cx={x + 15} cy={y + 10} rx="12" ry="6" fill="#B8D4E8" stroke="#7AB" strokeWidth="1" />
      <rect x={x + 5} y={y - 20} width="20" height="30" rx="3" fill="#87CEEB" opacity="0.7" stroke="#5BA" strokeWidth="1" />
      <ellipse cx={x + 15} cy={y - 20} rx="10" ry="4" fill="#87CEEB" stroke="#5BA" strokeWidth="1" />
      {/* Water bubbles */}
      <circle cx={x + 12} cy={y - 5} r="1.5" fill="rgba(255,255,255,0.6)">
        <animate attributeName="cy" values={`${y - 5};${y - 12};${y - 5}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={x + 18} cy={y - 2} r="1" fill="rgba(255,255,255,0.5)">
        <animate attributeName="cy" values={`${y - 2};${y - 10};${y - 2}`} dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Tap */}
      <rect x={x + 6} y={y + 28} width="6" height="4" rx="1" fill="#4A90D9" />
      <rect x={x + 18} y={y + 28} width="6" height="4" rx="1" fill="#E74C3C" />
    </g>
  );
}

// Big plant decoration
function BigPlant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Pot */}
      <path d={`M${x - 12},${y + 10} L${x - 15},${y + 40} L${x + 15},${y + 40} L${x + 12},${y + 10} Z`} fill="#C0714A" />
      <ellipse cx={x} cy={y + 10} rx="14" ry="5" fill="#D4835C" />
      <ellipse cx={x} cy={y + 10} rx="12" ry="4" fill="#5D4037" />
      {/* Leaves */}
      <ellipse cx={x - 8} cy={y - 10} rx="10" ry="14" fill="#4CAF50" transform={`rotate(-15 ${x - 8} ${y - 10})`} />
      <ellipse cx={x + 8} cy={y - 12} rx="9" ry="13" fill="#66BB6A" transform={`rotate(15 ${x + 8} ${y - 12})`} />
      <ellipse cx={x} cy={y - 18} rx="8" ry="15" fill="#388E3C" />
      <ellipse cx={x - 14} cy={y - 2} rx="7" ry="10" fill="#43A047" transform={`rotate(-30 ${x - 14} ${y - 2})`} />
      <ellipse cx={x + 14} cy={y - 4} rx="7" ry="10" fill="#81C784" transform={`rotate(30 ${x + 14} ${y - 4})`} />
      {/* Leaf veins */}
      <path d={`M${x},${y - 3} Q${x},${y - 25} ${x},${y - 30}`} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
    </g>
  );
}

// Individual desk with character
function IsometricDesk({
  agent,
  x,
  y,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  x: number;
  y: number;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}) {
  const char = getCharStyle(agent);
  const displayName = agent.agent_name || agent.name;
  const activity = char.activity;

  // Se tem descrição, o link principal vai no botão da descrição, não no bonequinho
  const hasButtons = !!(agent.description || (agent.sub_links && agent.sub_links.length > 0));
  const handleClick = async () => {
    if (hasButtons) return; // Usa os botões, não o clique no bonequinho
    await recordExecution(agent.id).catch(() => {});
    window.open(agent.link, "_blank");
  };

  // Animation timing offsets based on name hash for variety
  const hash = agent.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const delay = (hash % 10) * 0.3;

  return (
    <g className="desk-group" onClick={handleClick} style={{ cursor: "pointer" }}>
      {/* Desk surface (isometric look) */}
      <rect x={x - 45} y={y + 20} width="90" height="6" rx="1" fill="#DCC8A0" stroke="#B8A878" strokeWidth="0.5" />
      <polygon points={`${x - 45},${y + 20} ${x + 45},${y + 20} ${x + 43},${y + 26} ${x - 43},${y + 26}`} fill="#C8B48C" />
      {/* Desk legs */}
      <rect x={x - 40} y={y + 26} width="4" height="28" fill="#9B8560" />
      <rect x={x + 36} y={y + 26} width="4" height="28" fill="#9B8560" />
      {/* Drawer */}
      <rect x={x - 36} y={y + 30} width="72" height="18" rx="1" fill="#CCBA94" />
      <rect x={x - 10} y={y + 37} width="20" height="3" rx="1.5" fill="#A89870" />

      {/* Chair */}
      <ellipse cx={x} cy={y + 58} rx="16" ry="4" fill="rgba(0,0,0,0.1)" />
      <rect x={x - 14} y={y + 36} width="28" height="18" rx="4" fill="#3A3A44" />
      <rect x={x - 12} y={y + 28} width="24" height="12" rx="3" fill="#2D2D35" />

      {/* Monitor */}
      <rect x={x - 22} y={y - 12} width="44" height="30" rx="2" fill="#3C3C44" />
      <rect x={x - 20} y={y - 10} width="40" height="26" rx="1" fill="#1a2a1a" />
      {/* Screen content */}
      <rect x={x - 17} y={y - 7} width="22" height="1.5" fill="#33ff88" opacity="0.35" />
      <rect x={x - 17} y={y - 3} width="30" height="1.5" fill="#33ddff" opacity="0.3" />
      <rect x={x - 17} y={y + 1} width="18" height="1.5" fill="#33ff33" opacity="0.25">
        {activity === "typing" && (
          <animate attributeName="width" values="18;34;18" dur="2s" repeatCount="indefinite" />
        )}
      </rect>
      <rect x={x - 17} y={y + 5} width="28" height="1.5" fill="#ffaa33" opacity="0.2" />
      <rect x={x - 17} y={y + 9} width="24" height="1.5" fill="#33ff88" opacity="0.2" />
      {/* Cursor blink */}
      {activity === "typing" && (
        <rect x={x - 17} y={y + 12} width="4" height="2" rx="0.5" fill="#33ff33">
          <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
        </rect>
      )}
      {/* Reading - scroll animation */}
      {activity === "reading" && (
        <g>
          <rect x={x - 17} y={y - 7} width="34" height="20" fill="#1a2a1a" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={x - 15} y={y - 6 + i * 3} width={25 + (i % 3) * 4} height="1.5" fill="#88bbff" opacity="0.3">
              <animate attributeName="y" values={`${y - 6 + i * 3};${y - 9 + i * 3};${y - 6 + i * 3}`} dur="6s" repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      )}
      {/* Monitor LED */}
      <circle cx={x} cy={y + 19} r="1" fill="#33ff33" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Monitor stand */}
      <rect x={x - 5} y={y + 18} width="10" height="4" fill="#3C3C44" />

      {/* Keyboard */}
      <rect x={x - 18} y={y + 14} width="36" height="6" rx="1.5" fill="#E8E2DA" stroke="#C8C0B4" strokeWidth="0.4" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`k-${i}`} x={x - 16 + i * 4.5} y={y + 15.5} width="3.5" height="1.5" rx="0.3" fill="#F0EAE0" stroke="#D8D0C4" strokeWidth="0.2" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`k2-${i}`} x={x - 14 + i * 4.5} y={y + 18} width="3.5" height="1.5" rx="0.3" fill="#F0EAE0" stroke="#D8D0C4" strokeWidth="0.2" />
      ))}

      {/* Mouse */}
      <ellipse cx={x + 28} cy={y + 17} rx="3" ry="4" fill="#E8E2Da" stroke="#C8C0B4" strokeWidth="0.4" />

      {/* ===== CHARACTER ===== */}
      <g>
        {/* Body */}
        <rect x={x - 10} y={y + 2} width="20" height="18" rx="3" fill={char.shirt} />
        {/* Collar detail */}
        <path d={`M${x - 3},${y + 2} L${x},${y + 5} L${x + 3},${y + 2}`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* Head */}
        <g>
          {activity === "typing" && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-1.5; 0,0"
              dur="0.7s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          )}
          {activity === "thinking" && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${x} ${y - 8}; 4 ${x} ${y - 8}; 0 ${x} ${y - 8}; -3 ${x} ${y - 8}; 0 ${x} ${y - 8}`}
              dur="5s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          )}
          {activity === "reading" && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-2,0; 2,0; -2,0"
              dur="3.5s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          )}
          <ellipse cx={x} cy={y - 8} rx="12" ry="12" fill={char.skin} />

          {/* Hair */}
          {char.isFemale ? (
            <>
              <ellipse cx={x} cy={y - 17} rx="13" ry="8" fill={char.hair} />
              <path d={`M${x - 13},${y - 14} Q${x - 15},${y - 2} ${x - 14},${y + 3}`} fill={char.hair} stroke="none" />
              <path d={`M${x + 13},${y - 14} Q${x + 15},${y - 2} ${x + 14},${y + 3}`} fill={char.hair} stroke="none" />
              <ellipse cx={x - 13} cy={y - 14} rx="2" ry="6" fill={char.hair} />
              <ellipse cx={x + 13} cy={y - 14} rx="2" ry="6" fill={char.hair} />
              {/* Shine */}
              <path d={`M${x - 5},${y - 22} Q${x},${y - 24} ${x + 5},${y - 22}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            </>
          ) : (
            <>
              <ellipse cx={x} cy={y - 17} rx="12" ry="7" fill={char.hair} />
              <rect x={x - 12} y={y - 14} width="3" height="8" rx="1.5" fill={char.hair} />
              <rect x={x + 9} y={y - 14} width="3" height="8" rx="1.5" fill={char.hair} />
              {/* Ears */}
              <ellipse cx={x - 12} cy={y - 7} rx="2.5" ry="3" fill={char.skin} />
              <ellipse cx={x + 12} cy={y - 7} rx="2.5" ry="3" fill={char.skin} />
            </>
          )}

          {/* Eyes */}
          <ellipse cx={x - 4} cy={y - 7} rx="2.5" ry="2.8" fill="#fff" />
          <ellipse cx={x + 4} cy={y - 7} rx="2.5" ry="2.8" fill="#fff" />
          <circle cx={x - 3.5} cy={y - 6.5} r="1.6" fill="#1a1a2e">
            {activity === "reading" && (
              <animate attributeName="cx" values={`${x - 5};${x - 2};${x - 5}`} dur="3s" repeatCount="indefinite" begin={`${delay}s`} />
            )}
            {activity === "thinking" && (
              <animate attributeName="cy" values={`${y - 6.5};${y - 8};${y - 6.5}`} dur="4s" repeatCount="indefinite" begin={`${delay}s`} />
            )}
          </circle>
          <circle cx={x + 4.5} cy={y - 6.5} r="1.6" fill="#1a1a2e">
            {activity === "reading" && (
              <animate attributeName="cx" values={`${x + 3};${x + 6};${x + 3}`} dur="3s" repeatCount="indefinite" begin={`${delay}s`} />
            )}
            {activity === "thinking" && (
              <animate attributeName="cy" values={`${y - 6.5};${y - 8};${y - 6.5}`} dur="4s" repeatCount="indefinite" begin={`${delay}s`} />
            )}
          </circle>
          {/* Eye highlights */}
          <circle cx={x - 5} cy={y - 8} r="0.8" fill="#fff" />
          <circle cx={x + 3} cy={y - 8} r="0.8" fill="#fff" />

          {/* Glasses */}
          {char.hasGlasses && (
            <>
              <circle cx={x - 4} cy={y - 7} r="4" fill="none" stroke="#555" strokeWidth="0.8" />
              <circle cx={x + 4} cy={y - 7} r="4" fill="none" stroke="#555" strokeWidth="0.8" />
              <line x1={x} y1={y - 7} x2={x} y2={y - 7} stroke="#555" strokeWidth="0.8" />
            </>
          )}

          {/* Blush (female) */}
          {char.isFemale && (
            <>
              <ellipse cx={x - 7} cy={y - 4} rx="2.5" ry="1.5" fill="#FFB0A0" opacity="0.25" />
              <ellipse cx={x + 7} cy={y - 4} rx="2.5" ry="1.5" fill="#FFB0A0" opacity="0.25" />
            </>
          )}

          {/* Mouth */}
          {activity === "coffee" ? (
            <ellipse cx={x} cy={y - 2} rx="1.5" ry="1" fill="#D4736A" opacity="0.5">
              <animate attributeName="ry" values="1;2;1" dur="5s" repeatCount="indefinite" begin={`${delay}s`} />
            </ellipse>
          ) : (
            <path d={`M${x - 3},${y - 2} Q${x},${y} ${x + 3},${y - 2}`} fill="none" stroke="#B08070" strokeWidth="0.8" />
          )}
        </g>

        {/* ===== ARMS ===== */}
        {activity === "typing" ? (
          <>
            {/* Typing arms - more movement */}
            <path d={`M${x - 10},${y + 8} Q${x - 18},${y + 14} ${x - 16},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round">
              <animate
                attributeName="d"
                values={`M${x - 10},${y + 8} Q${x - 18},${y + 14} ${x - 16},${y + 20};M${x - 10},${y + 8} Q${x - 16},${y + 13} ${x - 12},${y + 18};M${x - 10},${y + 8} Q${x - 18},${y + 14} ${x - 16},${y + 20}`}
                dur="0.35s"
                repeatCount="indefinite"
                begin={`${delay}s`}
              />
            </path>
            <path d={`M${x + 10},${y + 8} Q${x + 18},${y + 14} ${x + 16},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round">
              <animate
                attributeName="d"
                values={`M${x + 10},${y + 8} Q${x + 18},${y + 14} ${x + 16},${y + 20};M${x + 10},${y + 8} Q${x + 16},${y + 13} ${x + 12},${y + 18};M${x + 10},${y + 8} Q${x + 18},${y + 14} ${x + 16},${y + 20}`}
                dur="0.45s"
                repeatCount="indefinite"
                begin={`${delay}s`}
              />
            </path>
            {/* Hands on keyboard */}
            <circle cx={x - 16} cy={y + 20} r="2.5" fill={char.skin}>
              <animate attributeName="cx" values={`${x - 16};${x - 12};${x - 16}`} dur="0.35s" repeatCount="indefinite" begin={`${delay}s`} />
              <animate attributeName="cy" values={`${y + 20};${y + 18};${y + 20}`} dur="0.35s" repeatCount="indefinite" begin={`${delay}s`} />
            </circle>
            <circle cx={x + 16} cy={y + 20} r="2.5" fill={char.skin}>
              <animate attributeName="cx" values={`${x + 16};${x + 12};${x + 16}`} dur="0.45s" repeatCount="indefinite" begin={`${delay}s`} />
              <animate attributeName="cy" values={`${y + 20};${y + 18};${y + 20}`} dur="0.45s" repeatCount="indefinite" begin={`${delay}s`} />
            </circle>
            {/* Sleeves */}
            <path d={`M${x - 10},${y + 6} Q${x - 14},${y + 10} ${x - 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d={`M${x + 10},${y + 6} Q${x + 14},${y + 10} ${x + 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        ) : activity === "coffee" ? (
          <>
            {/* Right arm resting */}
            <path d={`M${x + 10},${y + 8} Q${x + 16},${y + 14} ${x + 14},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx={x + 14} cy={y + 20} r="2.5" fill={char.skin} />
            <path d={`M${x + 10},${y + 6} Q${x + 14},${y + 10} ${x + 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Left arm lifting coffee */}
            <path d={`M${x - 10},${y + 8} Q${x - 20},${y + 10} ${x - 22},${y + 14}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round">
              <animate
                attributeName="d"
                values={`M${x - 10},${y + 8} Q${x - 20},${y + 10} ${x - 22},${y + 14};M${x - 10},${y + 8} Q${x - 18},${y + 4} ${x - 14},${y - 2};M${x - 10},${y + 8} Q${x - 18},${y + 4} ${x - 14},${y - 2};M${x - 10},${y + 8} Q${x - 20},${y + 10} ${x - 22},${y + 14}`}
                dur="5s"
                repeatCount="indefinite"
                begin={`${delay}s`}
                keyTimes="0;0.3;0.6;1"
              />
            </path>
            <path d={`M${x - 10},${y + 6} Q${x - 14},${y + 10} ${x - 16},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Coffee cup in hand */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 8,-16; 8,-16; 0,0"
                dur="5s"
                repeatCount="indefinite"
                begin={`${delay}s`}
                keyTimes="0;0.3;0.6;1"
              />
              <rect x={x - 28} y={y + 10} width="10" height="10" rx="2" fill="#F5F0EA" stroke="#D8D0C8" strokeWidth="0.6" />
              <rect x={x - 27} y={y + 11} width="8" height="5" rx="1" fill="#6B3A2A" opacity="0.4" />
              {/* Steam */}
              <path d={`M${x - 25},${y + 8} Q${x - 27},${y + 3} ${x - 25},${y - 2}`} fill="none" stroke="rgba(200,200,200,0.35)" strokeWidth="0.8" strokeLinecap="round">
                <animate attributeName="d" values={`M${x - 25},${y + 8} Q${x - 27},${y + 3} ${x - 25},${y - 2};M${x - 25},${y + 8} Q${x - 23},${y + 3} ${x - 25},${y - 2};M${x - 25},${y + 8} Q${x - 27},${y + 3} ${x - 25},${y - 2}`} dur="2s" repeatCount="indefinite" />
              </path>
              <path d={`M${x - 22},${y + 9} Q${x - 20},${y + 4} ${x - 22},${y}`} fill="none" stroke="rgba(200,200,200,0.2)" strokeWidth="0.6" strokeLinecap="round">
                <animate attributeName="d" values={`M${x - 22},${y + 9} Q${x - 20},${y + 4} ${x - 22},${y};M${x - 22},${y + 9} Q${x - 24},${y + 4} ${x - 22},${y};M${x - 22},${y + 9} Q${x - 20},${y + 4} ${x - 22},${y}`} dur="2.5s" repeatCount="indefinite" />
              </path>
            </g>
            {/* Hand */}
            <circle cx={x - 22} cy={y + 14} r="2.5" fill={char.skin}>
              <animate attributeName="cx" values={`${x - 22};${x - 14};${x - 14};${x - 22}`} dur="5s" repeatCount="indefinite" begin={`${delay}s`} keyTimes="0;0.3;0.6;1" />
              <animate attributeName="cy" values={`${y + 14};${y - 2};${y - 2};${y + 14}`} dur="5s" repeatCount="indefinite" begin={`${delay}s`} keyTimes="0;0.3;0.6;1" />
            </circle>
          </>
        ) : activity === "thinking" ? (
          <>
            {/* Left arm - hand on chin */}
            <path d={`M${x - 10},${y + 8} Q${x - 12},${y + 4} ${x - 6},${y - 1}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx={x - 5} cy={y - 1} r="2.5" fill={char.skin} />
            <path d={`M${x - 10},${y + 6} Q${x - 12},${y + 4} ${x - 10},${y + 2}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Right arm resting on desk */}
            <path d={`M${x + 10},${y + 8} Q${x + 16},${y + 14} ${x + 14},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx={x + 14} cy={y + 20} r="2.5" fill={char.skin} />
            <path d={`M${x + 10},${y + 6} Q${x + 14},${y + 10} ${x + 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Thought bubble */}
            <g>
              <circle cx={x + 14} cy={y - 22} r="1.5" fill="#fff" opacity="0">
                <animate attributeName="opacity" values="0;0;0.6;0.6;0" dur="6s" repeatCount="indefinite" begin={`${delay}s`} />
              </circle>
              <circle cx={x + 18} cy={y - 28} r="2.5" fill="#fff" opacity="0">
                <animate attributeName="opacity" values="0;0;0.6;0.6;0" dur="6s" repeatCount="indefinite" begin={`${delay + 0.3}s`} />
              </circle>
              <ellipse cx={x + 26} cy={y - 36} rx="12" ry="8" fill="#fff" stroke="#ccc" strokeWidth="0.5" opacity="0">
                <animate attributeName="opacity" values="0;0;0.7;0.7;0" dur="6s" repeatCount="indefinite" begin={`${delay + 0.5}s`} />
              </ellipse>
              <text x={x + 26} y={y - 34} textAnchor="middle" fontSize="8" fill="#666" opacity="0">
                . . .
                <animate attributeName="opacity" values="0;0;0.8;0.8;0" dur="6s" repeatCount="indefinite" begin={`${delay + 0.5}s`} />
              </text>
            </g>
          </>
        ) : (
          <>
            {/* Reading - relaxed arms */}
            <path d={`M${x - 10},${y + 8} Q${x - 16},${y + 14} ${x - 14},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx={x - 14} cy={y + 20} r="2.5" fill={char.skin} />
            <path d={`M${x + 10},${y + 8} Q${x + 16},${y + 14} ${x + 14},${y + 20}`} stroke={char.skin} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx={x + 14} cy={y + 20} r="2.5" fill={char.skin} />
            {/* Sleeves */}
            <path d={`M${x - 10},${y + 6} Q${x - 14},${y + 10} ${x - 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d={`M${x + 10},${y + 6} Q${x + 14},${y + 10} ${x + 14},${y + 12}`} stroke={char.shirt} strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* === INVISIBLE HITBOX — expands hover area so buttons don't disappear === */}
      <rect x={x - 50} y={y - 55} width="100" height="140" fill="transparent" />

      {/* === AGENT NAME — always visible above head === */}
      <text x={x} y={y - 38} textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold" fontFamily="'Segoe UI', Tahoma, sans-serif"
        stroke="#fff" strokeWidth="2" paintOrder="stroke">
        {displayName}
      </text>

      {/* === BADGE DE PRESENÇA — quantos contextos este colaborador atua === */}
      {agent.context_count && agent.context_count > 1 && (
        <g>
          <title>{displayName} atua em {agent.context_count} escritórios</title>
          <circle cx={x + 16} cy={y - 22} r="7" fill="#2D6B6B" stroke="#C4A460" strokeWidth="1.2" />
          <text x={x + 16} y={y - 19} textAnchor="middle" fill="#FFD700" fontSize="8" fontWeight="bold" fontFamily="'Segoe UI', Tahoma, sans-serif">
            {agent.context_count}
          </text>
        </g>
      )}

      {/* Edit/Delete buttons on hover — next to name */}
      <g className="agent-tooltip">
        <g onClick={(e) => { e.stopPropagation(); onEdit(agent); }} style={{ cursor: "pointer" }}>
          <rect x={x + 28} y={y - 48} width="20" height="20" rx="4" fill="#2563eb" />
          <text x={x + 38} y={y - 34} textAnchor="middle" fontSize="12" fill="#fff">✏️</text>
        </g>
        <g onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir ${displayName}?`)) onDelete(agent.id); }} style={{ cursor: "pointer" }}>
          <rect x={x + 52} y={y - 48} width="20" height="20" rx="4" fill="#dc2626" />
          <text x={x + 62} y={y - 34} textAnchor="middle" fontSize="12" fill="#fff">🗑️</text>
        </g>
      </g>

      {/* Name plaque on desk */}
      <rect x={x - 18} y={y + 22} width="36" height="8" rx="1" fill="#141430" />
      <text x={x} y={y + 28} textAnchor="middle" fill="#FFD700" fontSize="5" fontWeight="bold" fontFamily="'Segoe UI',Tahoma,sans-serif">
        {agent.name.length > 10 ? agent.name.slice(0, 9) + "…" : agent.name}
      </text>

      {/* === ALL FUNCTIONS AS BUTTONS below desk === */}
      {(() => {
        // Build list of all buttons: main description + sub_links
        const buttons: { label: string; url: string }[] = [];
        if (agent.description) {
          buttons.push({ label: agent.description, url: agent.link });
        }
        if (agent.sub_links) {
          agent.sub_links.forEach(sl => { if (sl.label && sl.url) buttons.push(sl); });
        }
        // If no description and no sub_links, show link as single button
        if (buttons.length === 0 && agent.link) {
          buttons.push({ label: agent.name, url: agent.link });
        }

        const btnH = 13;
        const gap = 2;
        return buttons.map((btn, bi) => {
          const label = btn.label.length > 22 ? btn.label.slice(0, 21) + "…" : btn.label;
          const btnW = Math.max(label.length * 4.5 + 12, 40);
          const btnX = x - btnW / 2;
          const btnY = y + 56 + bi * (btnH + gap);
          return (
            <g key={bi} onClick={(e) => { e.stopPropagation(); window.open(btn.url, "_blank"); recordExecution(agent.id); }} style={{ cursor: "pointer" }}>
              <rect x={btnX} y={btnY} width={btnW} height={btnH} rx="3" fill="#2563eb" />
              <text x={x} y={btnY + 9.5} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" fontFamily="'Segoe UI',Tahoma,sans-serif">
                {label}
              </text>
            </g>
          );
        });
      })()}
    </g>
  );
}

export default function OfficeScene({ agents, onEdit, onDelete }: OfficeSceneProps) {
  // Calculate viewBox based on number of agents
  const rows = Math.ceil(agents.length / 4);
  const viewHeight = Math.max(420, 200 + rows * 160);

  return (
    <div className="office-scene w-full overflow-auto" style={{ minHeight: 350 }}>
      <svg
        viewBox={`0 0 900 ${viewHeight}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ minHeight: 350, maxHeight: "70vh" }}
      >
        {/* Floor */}
        <rect x="0" y="0" width="900" height={viewHeight} fill="#C8C4B8" />
        {/* Floor tile pattern */}
        {Array.from({ length: Math.ceil(viewHeight / 40) }).map((_, row) =>
          Array.from({ length: 23 }).map((_, col) => (
            <FloorTile
              key={`tile-${row}-${col}`}
              x={col * 40}
              y={row * 40}
              w={40}
              h={40}
              color={(row + col) % 2 === 0 ? "#C8C4B8" : "#BEB8AC"}
            />
          ))
        )}

        {/* Walls */}
        <OfficeWalls />

        {/* Furniture */}
        <Cabinet x={10} y={80} />
        <Cabinet x={840} y={80} />
        <Printer x={740} y={155} />
        <WaterCooler x={60} y={155} />
        <BigPlant x={870} y={165} />
        <BigPlant x={30} y={340} />

        {/* Rug / carpet area */}
        <rect x={120} y={155} width={600} height={viewHeight - 175} rx="4" fill="rgba(46, 134, 222, 0.06)" stroke="rgba(46,134,222,0.1)" strokeWidth="1" />

        {/* Desks with characters */}
        {agents.map((agent, i) => {
          const pos = DESK_POSITIONS[i % DESK_POSITIONS.length];
          // Offset rows if more than 4 agents per row
          const row = Math.floor(i / 4);
          const col = i % 4;
          const adjustedX = 150 + col * 175;
          const adjustedY = 200 + row * 150;

          return (
            <IsometricDesk
              key={agent.id}
              agent={agent}
              x={adjustedX}
              y={adjustedY}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </svg>
    </div>
  );
}
