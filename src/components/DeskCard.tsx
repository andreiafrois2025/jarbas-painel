"use client";

import { Agent } from "@/lib/types";
import { recordExecution } from "@/lib/storage";

// =============================================
// DeskCard — Mesa com personagem estilo chibi fofo
// Cabeça grande, olhos brilhantes, mesa detalhada
// Inspirado em pixel art kawaii / chibi isométrico
// =============================================

interface DeskCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

function getCharacterStyle(name: string, gender: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const hairColors = ["#2C1810", "#1a1a2e", "#5C3317", "#8B6914", "#A0522D", "#4A2800", "#6B2D5B", "#D4A03C", "#C0392B", "#E08040"];
  const shirtColors = ["#E74C3C", "#4A90D9", "#2ECC71", "#9B59B6", "#F39C12", "#1ABC9C", "#E67E22", "#5DADE2", "#FF6B9D", "#48C9B0"];
  const skinTones = ["#FDDCB5", "#F5D0A9", "#EDCAA8", "#DBA97B", "#C68642", "#A0724A"];
  const eyeColors = ["#4A2810", "#1B5E20", "#1A237E", "#222222", "#5D4037"];

  const isFemale = gender === "female";

  return {
    hair: hairColors[hash % hairColors.length],
    shirt: shirtColors[hash % shirtColors.length],
    skin: skinTones[hash % skinTones.length],
    eyes: eyeColors[hash % eyeColors.length],
    isFemale,
    hasGlasses: !isFemale && hash % 4 === 0,
    hasCoffee: hash % 3 !== 0,
    hasPlant: hash % 4 === 0,
    hairStyle: hash % 3,
  };
}

export default function DeskCard({ agent, onEdit, onDelete }: DeskCardProps) {
  const char = getCharacterStyle(agent.name, agent.gender || "male");
  const displayName = agent.agent_name || agent.name;

  const handleOpen = async () => {
    await recordExecution(agent.id).catch(() => {});
    window.open(agent.link, "_blank");
  };

  return (
    <div
      className="desk-hover relative transition-all duration-200 cursor-pointer group"
      style={{ width: 180, height: 220 }}
      onClick={handleOpen}
      title={`${displayName} — Clique para abrir`}
    >
      {/* Botões editar/excluir no hover */}
      <div className="absolute top-0 right-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
          className="bg-[#333] hover:bg-[#555] text-white rounded px-1.5 py-0.5 text-[10px]"
          title="Editar"
        >✏️</button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}
          className="bg-[#333] hover:bg-[#a33] text-white rounded px-1.5 py-0.5 text-[10px]"
          title="Excluir"
        >❌</button>
      </div>

      <svg viewBox="0 0 180 220" width="180" height="220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={`nameShadow-${agent.id}`}>
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#fff" floodOpacity="0.8" />
          </filter>
          <radialGradient id={`screenGlow-${agent.id}`} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1a3a1a" />
            <stop offset="100%" stopColor="#0a1a0a" />
          </radialGradient>
          <linearGradient id={`hairShine-${agent.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* === NOME DO AGENTE === */}
        <text
          x="90" y="14"
          textAnchor="middle" fill="#222" fontSize="11" fontWeight="bold"
          fontFamily="'Inter','Segoe UI',sans-serif"
          filter={`url(#nameShadow-${agent.id})`}
        >
          {displayName.length > 14 ? displayName.slice(0, 13) + "…" : displayName}
        </text>

        {/* ===== MONITOR (atrás do personagem) ===== */}
        <rect x="48" y="22" width="84" height="60" rx="5" fill="#3C3C44" />
        <rect x="50" y="24" width="80" height="56" rx="4" fill="#2A2A32" />
        <rect x="53" y="27" width="74" height="48" rx="3" fill={`url(#screenGlow-${agent.id})`} />
        <rect x="53" y="27" width="74" height="12" rx="3" fill="rgba(255,255,255,0.03)" />

        {/* Conteúdo da tela */}
        <text x="58" y="39" fill="#5af" fontSize="6" fontFamily="monospace" opacity="0.8">const</text>
        <text x="78" y="39" fill="#f5a" fontSize="6" fontFamily="monospace" opacity="0.8">ai</text>
        <text x="88" y="39" fill="#5f5" fontSize="6" fontFamily="monospace" opacity="0.7">= run()</text>
        <rect x="58" y="43" width="45" height="1.5" fill="#33ff88" opacity="0.35" />
        <rect x="58" y="47" width="35" height="1.5" fill="#33ddff" opacity="0.3" />
        <rect x="58" y="51" width="55" height="1.5" fill="#33ff33" opacity="0.25">
          <animate attributeName="width" values="55;30;55" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="58" y="55" width="40" height="1.5" fill="#ffaa33" opacity="0.25" />
        <rect x="58" y="59" width="50" height="1.5" fill="#33ff88" opacity="0.2" />
        <rect x="58" y="63" width="5" height="3" rx="0.5" fill="#33ff33">
          <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
        </rect>

        {/* LED */}
        <circle cx="90" cy="78" r="1.5" fill="#33ff33" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Suporte do monitor */}
        <rect x="82" y="82" width="16" height="7" rx="1" fill="#3C3C44" />
        <rect x="74" y="88" width="32" height="3" rx="1.5" fill="#44444C" />
        <rect x="78" y="87" width="24" height="2" rx="1" fill="#55555D" />

        {/* ===== CADEIRA ===== */}
        <rect x="63" y="84" width="54" height="30" rx="6" fill="#2D2D35" />
        <rect x="66" y="87" width="48" height="24" rx="5" fill="#3A3A44" />
        <line x1="78" y1="88" x2="78" y2="110" stroke="#32323C" strokeWidth="1" />
        <line x1="90" y1="88" x2="90" y2="110" stroke="#32323C" strokeWidth="1" />
        <line x1="102" y1="88" x2="102" y2="110" stroke="#32323C" strokeWidth="1" />

        {/* ===== CORPO ===== */}
        <path d={`M66,112 Q66,100 78,97 L102,97 Q114,100 114,112 L114,133 L66,133 Z`} fill={char.shirt} />
        <path d="M66,112 Q66,100 78,97 L82,97 L82,133 L66,133 Z" fill="rgba(0,0,0,0.08)" />
        <path d="M84,97 L90,103 L96,97" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <rect x="96" y="108" width="8" height="7" rx="1" fill="rgba(0,0,0,0.06)" />
        <line x1="96" y1="108" x2="104" y2="108" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

        {/* ===== CABEÇA ===== */}
        <ellipse cx="90" cy="76" rx="24" ry="25" fill={char.skin} />
        <ellipse cx="72" cy="80" rx="4" ry="10" fill="rgba(0,0,0,0.02)" />
        <ellipse cx="108" cy="80" rx="4" ry="10" fill="rgba(0,0,0,0.02)" />

        {/* ===== CABELO ===== */}
        {char.isFemale ? (
          <>
            {/* FEMININO */}
            <ellipse cx="90" cy="56" rx="27" ry="18" fill={char.hair} />
            <ellipse cx="90" cy="56" rx="27" ry="18" fill={`url(#hairShine-${agent.id})`} />

            <path d="M63,56 L63,68 Q63,72 67,68" fill={char.hair} />
            <path d="M117,56 L117,68 Q117,72 113,68" fill={char.hair} />

            <path d="M63,58 Q58,72 56,88 Q55,100 54,112 Q53,122 57,124 Q62,126 64,118 Q66,106 67,92 Q68,78 66,64" fill={char.hair} />
            <path d="M117,58 Q122,72 124,88 Q125,100 126,112 Q127,122 123,124 Q118,126 116,118 Q114,106 113,92 Q112,78 114,64" fill={char.hair} />

            <ellipse cx="57" cy="122" rx="5" ry="6" fill={char.hair} />
            <ellipse cx="123" cy="122" rx="5" ry="6" fill={char.hair} />

            {char.hairStyle === 0 ? (
              <path d="M68,62 Q73,68 80,65 Q85,62 90,66 Q95,62 100,65 Q107,68 112,62" fill={char.hair} />
            ) : char.hairStyle === 1 ? (
              <path d="M66,64 Q72,70 80,67 Q88,63 96,65 Q104,67 112,62 L112,58 Q100,63 90,60 Q80,57 68,62 Z" fill={char.hair} />
            ) : (
              <path d="M72,64 Q78,68 84,64 Q87,62 90,65 Q93,62 96,64 Q102,68 108,64" fill={char.hair} />
            )}

            <path d="M76,50 Q82,47 88,50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M92,49 Q96,47 100,49" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Olhos kawaii */}
            <ellipse cx="80" cy="78" rx="6" ry="6.5" fill="#fff" />
            <ellipse cx="100" cy="78" rx="6" ry="6.5" fill="#fff" />
            <circle cx="81" cy="79" r="4" fill={char.eyes} />
            <circle cx="101" cy="79" r="4" fill={char.eyes} />
            <circle cx="81.5" cy="79.5" r="2" fill="#0a0a0a" />
            <circle cx="101.5" cy="79.5" r="2" fill="#0a0a0a" />
            <circle cx="78.5" cy="76.5" r="2" fill="#fff" />
            <circle cx="98.5" cy="76.5" r="2" fill="#fff" />
            <circle cx="83" cy="81" r="1" fill="#fff" opacity="0.6" />
            <circle cx="103" cy="81" r="1" fill="#fff" opacity="0.6" />

            {/* Cílios */}
            <path d="M74,72.5 Q76,70.5 78,72" stroke="#222" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M78,71 Q80.5,69.5 83,71.5" stroke="#222" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M97,71 Q99.5,69.5 102,71.5" stroke="#222" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M102,72.5 Q104,70.5 106,72" stroke="#222" strokeWidth="1.2" fill="none" strokeLinecap="round" />

            {/* Sobrancelhas */}
            <path d="M75,69 Q80,66.5 85,69" fill="none" stroke={char.hair} strokeWidth="1" opacity="0.5" />
            <path d="M95,69 Q100,66.5 105,69" fill="none" stroke={char.hair} strokeWidth="1" opacity="0.5" />

            {/* Nariz */}
            <path d="M89,85 L88,86.5 L90.5,86.5" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />

            {/* Boca */}
            <path d="M84,89 Q90,93 96,89" fill="#E8887A" opacity="0.6" />
            <path d="M84,89 Q90,91.5 96,89" fill="none" stroke="#D4736A" strokeWidth="0.8" />

            {/* Bochechas */}
            <ellipse cx="72" cy="84" rx="5" ry="3.5" fill="#FFB0A0" opacity="0.22" />
            <ellipse cx="108" cy="84" rx="5" ry="3.5" fill="#FFB0A0" opacity="0.22" />
          </>
        ) : (
          <>
            {/* MASCULINO */}
            <ellipse cx="90" cy="56" rx="25" ry="16" fill={char.hair} />
            <ellipse cx="90" cy="56" rx="25" ry="16" fill={`url(#hairShine-${agent.id})`} />

            <rect x="65" y="56" width="7" height="14" rx="3.5" fill={char.hair} />
            <rect x="108" y="56" width="7" height="14" rx="3.5" fill={char.hair} />

            {char.hairStyle === 0 ? (
              <path d="M70,62 Q80,66 90,62 Q100,58 110,63" fill={char.hair} />
            ) : char.hairStyle === 1 ? (
              <path d="M68,62 Q76,67 84,63 Q92,59 100,62 Q108,65 112,60" fill={char.hair} />
            ) : (
              <path d="M70,63 Q82,67 90,64 Q98,61 110,64" fill={char.hair} />
            )}

            <path d="M80,48 Q86,46 92,49" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />

            {/* Orelhas */}
            <ellipse cx="66" cy="78" rx="4.5" ry="6" fill={char.skin} />
            <ellipse cx="114" cy="78" rx="4.5" ry="6" fill={char.skin} />
            <ellipse cx="66" cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.04)" />
            <ellipse cx="114" cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.04)" />

            {/* Olhos */}
            <ellipse cx="80" cy="78" rx="5" ry="5.5" fill="#fff" />
            <ellipse cx="100" cy="78" rx="5" ry="5.5" fill="#fff" />
            <circle cx="81" cy="79" r="3.2" fill={char.eyes} />
            <circle cx="101" cy="79" r="3.2" fill={char.eyes} />
            <circle cx="81.5" cy="79.5" r="1.8" fill="#0a0a0a" />
            <circle cx="101.5" cy="79.5" r="1.8" fill="#0a0a0a" />
            <circle cx="79" cy="77" r="1.5" fill="#fff" />
            <circle cx="99" cy="77" r="1.5" fill="#fff" />
            <circle cx="83" cy="81" r="0.8" fill="#fff" opacity="0.5" />
            <circle cx="103" cy="81" r="0.8" fill="#fff" opacity="0.5" />

            {/* Óculos */}
            {char.hasGlasses && (
              <>
                <circle cx="80" cy="78" r="8" fill="none" stroke="#555" strokeWidth="1.3" />
                <circle cx="100" cy="78" r="8" fill="none" stroke="#555" strokeWidth="1.3" />
                <line x1="88" y1="78" x2="92" y2="78" stroke="#555" strokeWidth="1.3" />
                <line x1="72" y1="76" x2="66" y2="74" stroke="#555" strokeWidth="1" />
                <line x1="108" y1="76" x2="114" y2="74" stroke="#555" strokeWidth="1" />
                <path d="M76,74 Q78,72 80,74" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
                <path d="M96,74 Q98,72 100,74" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
              </>
            )}

            {/* Sobrancelhas */}
            <path d="M74,71 Q80,68 86,71" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M94,71 Q100,68 106,71" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" />

            {/* Nariz */}
            <path d="M89,84 L87.5,86.5 L91,86.5" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="0.8" />

            {/* Boca */}
            <path d="M84,89.5 Q90,93 96,89.5" fill="none" stroke="#B08070" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}

        {/* ===== MESA ===== */}
        <ellipse cx="90" cy="192" rx="78" ry="8" fill="rgba(0,0,0,0.08)" />

        <polygon points="6,134 174,134 170,139 10,139" fill="#DCC8A0" />
        <rect x="10" y="139" width="160" height="5" rx="0.5" fill="#C8B48C" />
        <line x1="60" y1="137" x2="120" y2="137" stroke="rgba(0,0,0,0.03)" strokeWidth="0.5" />
        <rect x="40" y="135" width="80" height="1" fill="rgba(255,255,255,0.08)" rx="0.5" />

        {/* Pernas */}
        <rect x="16" y="144" width="6" height="42" rx="1" fill="#9B8560" />
        <rect x="158" y="144" width="6" height="42" rx="1" fill="#9B8560" />
        <rect x="16" y="144" width="2" height="42" rx="1" fill="rgba(0,0,0,0.05)" />
        <rect x="158" y="144" width="2" height="42" rx="1" fill="rgba(0,0,0,0.05)" />

        {/* Gaveta */}
        <rect x="22" y="148" width="136" height="30" rx="2" fill="#CCBA94" />
        <rect x="24" y="150" width="132" height="26" rx="1.5" fill="#D4C49C" />
        <rect x="28" y="153" width="124" height="20" rx="1" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" />
        <rect x="78" y="161" width="24" height="3" rx="1.5" fill="#A89870" />
        <rect x="80" y="162" width="20" height="1" rx="0.5" fill="rgba(255,255,255,0.15)" />

        {/* ===== BRAÇOS ===== */}
        <path d="M74,112 Q66,120 58,130" stroke={char.skin} strokeWidth="7" fill="none" strokeLinecap="round">
          <animate attributeName="d" values="M74,112 Q66,120 58,130;M74,112 Q66,119 57,129;M74,112 Q66,120 58,130" dur="0.45s" repeatCount="indefinite" />
        </path>
        <path d="M106,112 Q114,120 122,130" stroke={char.skin} strokeWidth="7" fill="none" strokeLinecap="round">
          <animate attributeName="d" values="M106,112 Q114,120 122,130;M106,112 Q114,119 123,129;M106,112 Q114,120 122,130" dur="0.55s" repeatCount="indefinite" />
        </path>
        <path d="M74,112 Q70,116 67,120" stroke={char.shirt} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9" />
        <path d="M106,112 Q110,116 113,120" stroke={char.shirt} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9" />
        <circle cx="58" cy="130" r="4.5" fill={char.skin}>
          <animate attributeName="cy" values="130;129;130" dur="0.45s" repeatCount="indefinite" />
        </circle>
        <circle cx="122" cy="130" r="4.5" fill={char.skin}>
          <animate attributeName="cy" values="130;129;130" dur="0.55s" repeatCount="indefinite" />
        </circle>

        {/* ===== TECLADO ===== */}
        <rect x="44" y="126" width="80" height="11" rx="3" fill="#E8E2DA" stroke="#C8C0B4" strokeWidth="0.6" />
        <rect x="44" y="126" width="80" height="2" rx="1" fill="rgba(255,255,255,0.12)" />
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map((i) => (
          <rect key={`k1-${i}`} x={47 + i * 5.3} y={128.5} width="4" height="2.5" rx="0.5" fill="#F0EAE0" stroke="#D8D0C4" strokeWidth="0.3" />
        ))}
        {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
          <rect key={`k2-${i}`} x={49 + i * 5.3} y={132} width="4" height="2.5" rx="0.5" fill="#F0EAE0" stroke="#D8D0C4" strokeWidth="0.3" />
        ))}

        {/* ===== MOUSE ===== */}
        <ellipse cx="140" cy="131" rx="6" ry="7" fill="#E8E2Da" stroke="#C8C0B4" strokeWidth="0.6" />
        <line x1="140" y1="125" x2="140" y2="130" stroke="#D0C8BC" strokeWidth="0.5" />
        <rect x="139" y="127" width="2" height="3" rx="1" fill="#C8C0B4" />
        <path d="M140,124 Q140,120 144,118" fill="none" stroke="#C0B8AC" strokeWidth="0.8" />

        {/* ===== ITENS ===== */}
        {char.hasCoffee && (
          <g>
            <rect x="14" y="122" width="14" height="16" rx="3" fill="#F5F0EA" stroke="#D8D0C8" strokeWidth="0.8" />
            <path d="M28,126 Q33,126 33,130.5 Q33,135 28,135" fill="none" stroke="#D8D0C8" strokeWidth="1.2" />
            <rect x="16" y="124" width="10" height="7" rx="1.5" fill="#6B3A2A" opacity="0.4" />
            <text x="19" y="135" fontSize="5" fill="#D8D0C8" opacity="0.6">♥</text>
            <path d="M19,120 Q17,115 19,110" fill="none" stroke="rgba(200,200,200,0.3)" strokeWidth="0.8" strokeLinecap="round">
              <animate attributeName="d" values="M19,120 Q17,115 19,110;M19,120 Q21,115 19,110;M19,120 Q17,115 19,110" dur="2.5s" repeatCount="indefinite" />
            </path>
            <path d="M23,119 Q25,114 23,109" fill="none" stroke="rgba(200,200,200,0.2)" strokeWidth="0.6" strokeLinecap="round">
              <animate attributeName="d" values="M23,119 Q25,114 23,109;M23,119 Q21,114 23,109;M23,119 Q25,114 23,109" dur="3s" repeatCount="indefinite" />
            </path>
          </g>
        )}

        {char.hasPlant && (
          <g>
            <path d="M148,130 L146,138 L160,138 L158,130 Z" fill="#D4835C" />
            <rect x="145" y="128" width="16" height="3" rx="1" fill="#E09468" />
            <ellipse cx="153" cy="130" rx="5" ry="1.5" fill="#5D4037" />
            <ellipse cx="153" cy="122" rx="6" ry="6" fill="#4CAF50" />
            <ellipse cx="148" cy="126" rx="4.5" ry="5" fill="#388E3C" />
            <ellipse cx="158" cy="125" rx="4" ry="4.5" fill="#66BB6A" />
            <path d="M151,119 Q153,117 155,119" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          </g>
        )}

        {/* ===== PLAQUINHA ===== */}
        <rect x="30" y="152" width="120" height="22" rx="3" fill="#141430" />
        <rect x="30" y="152" width="120" height="22" rx="3" fill="none" stroke="#FFD700" strokeWidth="0.6" opacity="0.35" />
        <rect x="32" y="153" width="116" height="3" rx="1.5" fill="rgba(255,255,255,0.03)" />

        <text x="90" y="164" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="bold" fontFamily="'Segoe UI',Tahoma,sans-serif">
          {(agent.description || agent.agent_name || "").length > 16 ? (agent.description || agent.agent_name || "").slice(0, 15) + "…" : (agent.description || agent.agent_name || "")}
        </text>
      </svg>
    </div>
  );
}
