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
  // Planetinhas da tela holográfica (Comando)
  orbitas: [
    { x: 0.4707, y: 0.2142, rx: 0.0519, ry: 0.0192, planetas: [
      { cor: "#FFE27A", r: 0.0051, dur: 46, fase: 0 },
      { cor: "#8FF0FF", r: 0.004, dur: 62, fase: 0.45 },
      { cor: "#FFFFFF", r: 0.0034, dur: 38, fase: 0.75 },
    ] },
  ],
  telinhas: [
    { x: 0.3906, y: 0.2683, w: 0.0147, h: 0.0214, delay: 0 },
    { x: 0.4216, y: 0.3067, w: 0.0225, h: 0.0135, delay: 1.1 },
    { x: 0.5152, y: 0.3044, w: 0.0214, h: 0.0147, delay: 0.5 },
    { x: 0.4216, y: 0.3596, w: 0.018, h: 0.0051, delay: 1.9 },
    { x: 0.5051, y: 0.3596, w: 0.018, h: 0.0051, delay: 0.8 },
  ],
  brilhos: [
    // esfera central do holograma + lâmpadas (poucas)
    { x: 0.4735, y: 0.2142, r: 0.0259, dur: 5.5, delay: 0, cor: "120,230,255" },
    { x: 0.3523, y: 0.1578, r: 0.0169, dur: 4.6, delay: 0 },
    { x: 0.5507, y: 0.1939, r: 0.0158, dur: 5.2, delay: 1.2, liga: true },
    { x: 0.252, y: 0.2086, r: 0.0147, dur: 4.2, delay: 0.6 },
    { x: 0.6821, y: 0.1917, r: 0.0158, dur: 5.6, delay: 2 },
    { x: 0.8737, y: 0.2446, r: 0.0147, dur: 6, delay: 0.4, liga: true },
    { x: 0.2379, y: 0.5581, r: 0.0147, dur: 4.8, delay: 1.6 },
    { x: 0.6003, y: 0.6336, r: 0.0135, dur: 5.2, delay: 3 },
    { x: 0.6973, y: 0.6077, r: 0.0135, dur: 4.4, delay: 0.8 },
    { x: 0.0744, y: 0.6336, r: 0.0101, dur: 4.0, delay: 2.2 },
  ],
  flash: { x: 0.0846, y: 0.274, r: 0.0124 },
  ring: { x: 0.1071, y: 0.2525, r: 0.0169 },
  telasLab: [
    { x: 0.6714, y: 0.6539, w: 0.0304, h: 0.0237, tipo: "grafico", delay: 0 },
    { x: 0.7452, y: 0.664, w: 0.0214, h: 0.0214, tipo: "codigo", delay: 1 },
    { x: 0.7779, y: 0.6798, w: 0.0214, h: 0.0214, tipo: "linhas", delay: 2.5 },
  ],
  leds: [
    { x: 0.9256, y: 0.6776, n: 5, dy: 0.0147, w: 0.0045 },
    { x: 0.938, y: 0.6776, n: 5, dy: 0.0147, w: 0.0045 },
  ],
  lupa: { x: 0.7356, y: 0.823, r: 0.0073 },
  relogio: { x: 0.2773, y: 0.584, r: 0.0169 },
  espresso: { x: 0.5051, y: 0.6268 },
  xicara: { dx: 0.0169, dy: -0.065 },
  poeira: { x: 0.0986, y: 0.2142, w: 0.0676, h: 0.062 },
};
