// Tradutor de cron pra português — o crontab da VPS roda em UTC,
// mas a Andréia pensa em horário de Brasília (BRT = UTC-3, sem horário de verão).
//
// Analogia: cron é um formulário de 5 campos —
// minuto | hora | dia do mês | mês | dia da semana.
// O "*" é deixar o campo em branco: "qualquer valor serve".

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const OFFSET_BRT = -3; // horas

export interface CronInfo {
  valido: boolean;
  descricao: string;      // "todo dia às 6h30" (já em BRT)
  frequenciaMin: number;  // periodicidade aproximada em minutos — pra ordenar
  proxima: Date | null;   // próxima execução (instante real)
}

/** Expande um campo de cron na lista de valores possíveis dentro de [min, max]. */
function expandeCampo(campo: string, min: number, max: number): number[] | null {
  const valores = new Set<number>();
  for (const parte of campo.split(",")) {
    const [faixa, passoStr] = parte.split("/");
    const passo = passoStr ? parseInt(passoStr, 10) : 1;
    if (Number.isNaN(passo) || passo < 1) return null;

    let de: number, ate: number;
    if (faixa === "*") {
      de = min; ate = max;
    } else if (faixa.includes("-")) {
      const [a, b] = faixa.split("-").map((n) => parseInt(n, 10));
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      de = a; ate = b;
    } else {
      const n = parseInt(faixa, 10);
      if (Number.isNaN(n)) return null;
      // valor único sem passo: só ele. Com passo (ex.: "5/10"): dele até o fim.
      de = n; ate = passoStr ? max : n;
    }
    for (let v = de; v <= ate; v += passo) {
      valores.add(v === 7 && max === 6 ? 0 : v); // domingo pode vir como 7
    }
  }
  const lista = [...valores].filter((v) => v >= min && v <= max).sort((a, b) => a - b);
  return lista.length ? lista : null;
}

/** Detecta o "passo" de um campo tipo `*​/5` (ou lista com espaçamento regular). */
function passoDe(campo: string): number | null {
  const m = campo.match(/^\*\/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function hhmm(h: number, m: number): string {
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Converte uma hora UTC pra BRT. Retorna [hora, deslocamentoDeDia]. */
function paraBRT(horaUTC: number): [number, number] {
  const h = horaUTC + OFFSET_BRT;
  if (h < 0) return [h + 24, -1];
  if (h > 23) return [h - 24, 1];
  return [h, 0];
}

function listaPorExtenso(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Calcula a próxima execução varrendo minuto a minuto até 40 dias à frente.
 * Suficiente pra tudo que temos (o mais raro é semanal/mensal).
 */
function proximaExecucao(
  min: number[], hor: number[], dom: number[], mes: number[], dow: number[],
  domCuringa: boolean, dowCuringa: boolean,
): Date | null {
  const agora = new Date();
  const d = new Date(Date.UTC(
    agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(),
    agora.getUTCHours(), agora.getUTCMinutes() + 1, 0, 0,
  ));
  const limite = 40 * 24 * 60;
  for (let i = 0; i < limite; i++) {
    const okMin = min.includes(d.getUTCMinutes());
    const okHora = hor.includes(d.getUTCHours());
    const okMes = mes.includes(d.getUTCMonth() + 1);
    const okDom = dom.includes(d.getUTCDate());
    const okDow = dow.includes(d.getUTCDay());
    // Regra do cron: se os dois campos de dia são específicos, vale OU; senão, E.
    const okDia = domCuringa || dowCuringa ? okDom && okDow : okDom || okDow;
    if (okMin && okHora && okMes && okDia) return d;
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return null;
}

export function interpretaCron(expr: string): CronInfo {
  const invalido: CronInfo = { valido: false, descricao: expr, frequenciaMin: Number.MAX_SAFE_INTEGER, proxima: null };
  const campos = expr.trim().split(/\s+/);
  if (campos.length !== 5) {
    // Atalhos do cron (@daily, @reboot…)
    const atalhos: Record<string, string> = {
      "@reboot": "toda vez que a VPS liga",
      "@yearly": "uma vez por ano", "@annually": "uma vez por ano",
      "@monthly": "uma vez por mês", "@weekly": "uma vez por semana",
      "@daily": "todo dia à meia-noite (UTC)", "@midnight": "todo dia à meia-noite (UTC)",
      "@hourly": "de hora em hora",
    };
    const at = atalhos[expr.trim().toLowerCase()];
    return at ? { ...invalido, valido: true, descricao: at } : invalido;
  }

  const [cMin, cHora, cDom, cMes, cDow] = campos;
  const min = expandeCampo(cMin, 0, 59);
  const hor = expandeCampo(cHora, 0, 23);
  const dom = expandeCampo(cDom, 1, 31);
  const mes = expandeCampo(cMes, 1, 12);
  const dow = expandeCampo(cDow, 0, 6);
  if (!min || !hor || !dom || !mes || !dow) return invalido;

  const domCuringa = cDom === "*";
  const dowCuringa = cDow === "*";
  const proxima = proximaExecucao(min, hor, dom, mes, dow, domCuringa, dowCuringa);

  // ── Frequência aproximada (pra ordenar da mais frequente pra mais rara) ──
  const passoMin = passoDe(cMin);
  const passoHora = passoDe(cHora);
  let frequenciaMin: number;
  if (cHora === "*" && cMin === "*") frequenciaMin = 1;
  else if (cHora === "*" && passoMin) frequenciaMin = passoMin;
  else if (cHora === "*") frequenciaMin = 60 / min.length;
  else if (passoHora) frequenciaMin = passoHora * 60;
  else frequenciaMin = (24 * 60) / (hor.length * min.length);
  if (!domCuringa || !dowCuringa) frequenciaMin *= dowCuringa ? 30 : 7;

  // ── Descrição em português ──
  // viraDia: quando a conversão UTC→BRT joga o horário pro dia anterior
  // (ex.: 1h UTC = 22h do dia anterior aqui). Aí o dia da semana também anda.
  let viraDia = 0;
  let quando: string;
  if (cMin === "*" && cHora === "*") {
    quando = "a cada minuto";
  } else if (passoMin && cHora === "*") {
    quando = `a cada ${passoMin} minutos`;
  } else if (cHora === "*" && min.length === 1) {
    quando = `de hora em hora (no minuto ${min[0]})`;
  } else if (cHora === "*") {
    quando = `${min.length}x por hora (minutos ${min.join(", ")})`;
  } else if (passoHora && min.length === 1) {
    quando = `a cada ${passoHora} horas`;
  } else if (hor.length * min.length <= 4) {
    // Horários concretos — aqui vale a pena converter pra BRT.
    const horarios: string[] = [];
    for (const h of hor) {
      const [hBRT, delta] = paraBRT(h);
      if (delta) viraDia = delta;
      for (const m of min) horarios.push(hhmm(hBRT, m));
    }
    quando = `às ${listaPorExtenso(horarios)}`;
  } else {
    quando = `${hor.length * min.length}x por dia`;
  }

  // ── Qual dia ──
  let dia = "";
  if (!dowCuringa) {
    // Nomes dos dias já ajustados pro fuso: 1h UTC de segunda é domingo aqui.
    const dowBRT = dow.map((d) => (d + viraDia + 7) % 7).sort((a, b) => a - b);
    dia = dow.length === 7 ? "" : ` · ${listaPorExtenso(dowBRT.map((d) => DIAS[d]))}`;
  } else if (!domCuringa) {
    const diasBRT = dom.map((d) => d + viraDia).map((d) => (d < 1 ? "último dia" : `dia ${d}`));
    dia = ` · ${listaPorExtenso(diasBRT)} do mês`;
  }
  const emMes = cMes === "*" ? "" : ` · em ${listaPorExtenso(mes.map((m) => MESES[m]))}`;

  const prefixo = quando.startsWith("às") && !dia ? "todo dia " : "";
  return {
    valido: true,
    descricao: `${prefixo}${quando}${dia}${emMes}`,
    frequenciaMin,
    proxima,
  };
}

/** "hoje às 14h30" / "amanhã às 6h" / "sáb, 26/07 às 9h" — sempre em BRT. */
export function formataProxima(d: Date | null): string {
  if (!d) return "—";
  const brt = (x: Date) => new Date(x.getTime() + OFFSET_BRT * 3600 * 1000);
  const alvo = brt(d);
  const hoje = brt(new Date());
  const diaAlvo = Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), alvo.getUTCDate());
  const diaHoje = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const delta = Math.round((diaAlvo - diaHoje) / 86400000);
  const hora = hhmm(alvo.getUTCHours(), alvo.getUTCMinutes());
  if (delta === 0) return `hoje às ${hora}`;
  if (delta === 1) return `amanhã às ${hora}`;
  const dd = String(alvo.getUTCDate()).padStart(2, "0");
  const mm = String(alvo.getUTCMonth() + 1).padStart(2, "0");
  return `${DIAS[alvo.getUTCDay()].slice(0, 3)}, ${dd}/${mm} às ${hora}`;
}
