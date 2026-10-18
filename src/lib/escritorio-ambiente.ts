// Camadas de animação do ambiente do escritório (por cima de sede.webp).
// Tudo em coordenadas RELATIVAS ao prédio (0 a 1): x = fração da largura, y = fração da altura.
// Tamanhos (r, w, h, rx, ry) são frações da LARGURA. Só transform e opacity são animados.
// Os pontos foram lidos olhando a imagem do prédio (ver escritorio-ambiente-pontos abaixo).

export interface Planeta { cor: string; r: number; dur: number; fase: number }
export interface Orbita { x: number; y: number; rx: number; ry: number; planetas: Planeta[] }
export interface Retangulo { x: number; y: number; w: number; h: number; delay?: number }
export interface Brilho { x: number; y: number; r: number; dur: number; delay: number; cor?: string; liga?: boolean }
export interface TelaLab extends Retangulo { tipo: "grafico" | "codigo" | "linhas" }
export interface Led { x: number; y: number; n: number; dy: number; w: number }

export interface Ambiente {
  orbitas: Orbita[];
  telinhas: Retangulo[];
  brilhos: Brilho[];          // lâmpadas e luminárias (poucas)
  flash: { x: number; y: number; r: number } | null;   // câmera do Theo
  ring: { x: number; y: number; r: number } | null;    // ring light
  telasLab: TelaLab[];
  leds: Led[];                // servidor
  lupa: { x: number; y: number; r: number } | null;
  relogio: { x: number; y: number; r: number } | null;
  espresso: { x: number; y: number } | null;
  xicara: { dx: number; dy: number };                  // onde sai a fumaça, em relação ao pé de quem está no café (fração da largura)
  poeira: Retangulo | null;   // feixe de luz da janela do hall
}

export const AMBIENTE: Ambiente = {
  orbitas: [], telinhas: [], brilhos: [], flash: null, ring: null, telasLab: [], leds: [], lupa: null,
  relogio: null, espresso: null, xicara: { dx: 0.022, dy: -0.045 }, poeira: null,
};
