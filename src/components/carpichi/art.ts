// Carpichi: la mascota de la app. Todo el dibujo vive en este archivo, como SVG en texto,
// y lo usan tanto los componentes React (carpichi.tsx) como el favicon (src/app/icon.tsx).
// Para cambiar el personaje, tocá las partes de acá abajo: se reflejan en toda la app.

export const COLORS = {
  line: "#3B2618",
  fur: "#B07A4A",
  furDark: "#93613A",
  light: "#D9AD82",
  nose: "#5A3A26",
  earIn: "#6E4429",
  stache: "#2E1D12",
  blush: "#E58F78",
  green: "#10846A",
  greenDark: "#0B6450",
  leaf: "#4F8F3A",
  drop: "#7CC6E6",
  paper: "#FFFDF8",
  spark: "#F2B544",
};
const C = COLORS;
const S = `stroke="${C.line}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
const S3 = `stroke="${C.line}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

type Point = [number, number];

// ---------- partes del cuerpo (lienzo 210 × 220) ----------

const feet = `
  <ellipse cx="76" cy="203" rx="19" ry="9" fill="${C.furDark}" ${S}/>
  <ellipse cx="128" cy="203" rx="19" ry="9" fill="${C.furDark}" ${S}/>`;

const body = `
  <path d="M40 164 C40 128 68 116 102 116 C136 116 164 128 164 164 C164 194 138 208 102 208 C66 208 40 194 40 164Z" fill="${C.fur}" ${S}/>
  <ellipse cx="102" cy="172" rx="36" ry="27" fill="${C.light}" opacity=".5"/>`;

const ears = `
  <ellipse cx="60" cy="30" rx="10" ry="9" fill="${C.furDark}" ${S}/>
  <ellipse cx="144" cy="30" rx="10" ry="9" fill="${C.furDark}" ${S}/>
  <ellipse cx="60" cy="31" rx="4" ry="3.5" fill="${C.earIn}"/>
  <ellipse cx="144" cy="31" rx="4" ry="3.5" fill="${C.earIn}"/>`;

// Cabeza de carpincho: alta y cuadrada, hocico largo, nariz ancha arriba del hocico.
const head = `
  <rect x="50" y="22" width="104" height="108" rx="38" fill="${C.fur}" ${S}/>
  <path d="M92 25 q5 -8 10 0 q5 -8 10 0" fill="none" ${S3}/>
  <rect x="62" y="68" width="80" height="60" rx="28" fill="${C.light}"/>
  <rect x="80" y="72" width="44" height="17" rx="8.5" fill="${C.nose}"/>
  <ellipse cx="62" cy="96" rx="8" ry="5.5" fill="${C.blush}" opacity=".55"/>
  <ellipse cx="142" cy="96" rx="8" ry="5.5" fill="${C.blush}" opacity=".55"/>`;

// Mostacho con las puntas enruladas para arriba.
const stache = `
  <path d="M102 92
    C94 88 82 89 76 95 C70 101 62 100 61 92
    C57 104 68 113 82 107 C90 103 97 105 102 101
    C107 105 114 103 122 107 C136 113 147 104 143 92
    C142 100 134 101 128 95 C122 89 110 88 102 92Z"
    fill="${C.stache}" ${S3}/>`;

const mouth = {
  smile: `<path d="M95 115 q7 6 14 0" fill="none" ${S3}/>`,
  o: `<ellipse cx="102" cy="116" rx="4.5" ry="5" fill="${C.line}"/>`,
};

const eyes = {
  // párpados a media asta: el carpincho tranqui
  chill: `
    <path d="M68 56 h18 M118 56 h18" fill="none" ${S}/>
    <path d="M71.5 56 a5.5 5 0 0 0 11 0Z M121.5 56 a5.5 5 0 0 0 11 0Z" fill="${C.line}"/>`,
  open: `
    <circle cx="77" cy="56" r="8.5" fill="#fff" ${S3}/>
    <circle cx="127" cy="56" r="8.5" fill="#fff" ${S3}/>
    <circle cx="77" cy="57" r="4.2" fill="${C.line}"/>
    <circle cx="127" cy="57" r="4.2" fill="${C.line}"/>
    <circle cx="78.4" cy="55.2" r="1.3" fill="#fff"/>
    <circle cx="128.4" cy="55.2" r="1.3" fill="#fff"/>`,
  sleep: `<path d="M68 55 q9 7 18 0 M118 55 q9 7 18 0" fill="none" ${S}/>`,
  happy: `<path d="M68 59 q9 -10 18 0 M118 59 q9 -10 18 0" fill="none" ${S}/>`,
};

const brows = {
  up: `<path d="M67 42 q10 -6 19 -1 M118 41 q9 -5 19 1" fill="none" ${S3}/>`,
  angry: `<path d="M68 40 l18 6 M136 40 l-18 6" fill="none" ${S3}/>`,
  skeptic: `<path d="M68 45 h18 M118 40 q9 -6 19 0" fill="none" ${S3}/>`,
};

// Dedo curvo: sale de la base, se abre hacia afuera (control) y vuelve a la punta.
const finger = ([x1, y1]: Point, [qx, qy]: Point, [x2, y2]: Point, w = 7) => {
  const d = `M${x1} ${y1} Q${qx} ${qy} ${x2} ${y2}`;
  return `
    <path d="${d}" fill="none" stroke="${C.line}" stroke-width="${w + 4}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${C.furDark}" stroke-width="${w}" stroke-linecap="round"/>`;
};

// Mano 🤌: dedos que se abren como un pimpollo y se juntan en la punta; pulgar cruzando adelante.
// (cx, by) = centro de la base de la mano; flip la espeja para la mano izquierda.
const pinch = (cx: number, by: number, flip = false) => `
  <g transform="translate(${cx} ${by}) scale(${flip ? -1 : 1} 1)">
    <path d="M12 2 Q22 -18 2 -38 L-2 -38 Q-22 -18 -12 2 Q-12 14 0 14 Q12 14 12 2Z" fill="${C.furDark}" ${S}/>
    ${finger([11, -1], [17, -18], [3, -33])}
    ${finger([-11, -1], [-17, -18], [-3, -33])}
    ${finger([5, -4], [9, -21], [1, -36])}
    ${finger([-5, -4], [-9, -21], [-1, -36])}
    ${finger([-12, 5], [-14, -7], [-4, -18], 6)}
    <path d="M-26 -34 q-6 8 0 16 M26 -34 q6 8 0 16" fill="none" stroke="${C.line}" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;

// Brazo desde el costado del cuerpo hasta la mano.
const arm = (x1: number, y1: number, x2: number, y2: number) => {
  const d = `M${x1} ${y1} Q${(x1 + x2) / 2 + (x2 > 102 ? 6 : -6)} ${(y1 + y2) / 2 + 6} ${x2} ${y2}`;
  return `
  <path d="${d}" fill="none" stroke="${C.line}" stroke-width="22" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${C.fur}" stroke-width="14" stroke-linecap="round"/>`;
};

const restPaw = (x: number, y: number) =>
  `<ellipse cx="${x}" cy="${y}" rx="11" ry="9" fill="${C.furDark}" ${S}/>`;

const sweat = `<path d="M166 34 c5 8 8 12 8 16 a8 8 0 0 1 -16 0 c0 -4 3 -8 8 -16Z" fill="${C.drop}" ${S3}/>`;

const zzz = `
  <path d="M160 14 h12 l-12 13 h12" fill="none" ${S3}/>
  <path d="M178 0 h9 l-9 10 h9" fill="none" ${S3}/>`;

const sparkle = (x: number, y: number, r = 7) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${C.spark}" ${S3}/>`;

const bag = `
  <path d="M132 146 q12 -22 24 0" fill="none" ${S}/>
  <path d="M142 118 l8 34" fill="none" stroke="${C.line}" stroke-width="11" stroke-linecap="round"/>
  <path d="M142 118 l8 34" fill="none" stroke="#E9D9B5" stroke-width="6" stroke-linecap="round"/>
  <path d="M156 114 l-2 36" fill="none" stroke="${C.line}" stroke-width="10" stroke-linecap="round"/>
  <path d="M156 114 l-2 36" fill="none" stroke="${C.leaf}" stroke-width="5" stroke-linecap="round"/>
  <rect x="120" y="144" width="52" height="56" rx="7" fill="${C.green}" ${S}/>
  <path d="M132 164 h28" fill="none" stroke="${C.greenDark}" stroke-width="3" stroke-linecap="round"/>`;

const chefHat = `
  <path d="M62 34 C50 30 48 10 64 8 C66 -6 86 -10 94 0 C102 -12 124 -8 126 4 C142 2 152 22 140 34Z" fill="#fff" ${S}/>
  <rect x="64" y="26" width="76" height="16" rx="5" fill="#fff" ${S}/>`;

// ---------- composiciones ----------

const svg = (inner: string, viewBox: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true">${inner}</svg>`;

const face = (e: keyof typeof eyes, b: keyof typeof brows, m: keyof typeof mouth) =>
  `${head}${eyes[e]}${brows[b]}${stache}${mouth[m]}`;

export type CarpichiPose = "capisci" | "ma-che" | "perfetto" | "siesta" | "compras" | "chef";

export const POSE_LABELS: Record<CarpichiPose, string> = {
  capisci: "Carpichi haciendo el gesto 🤌",
  "ma-che": "Carpichi preocupado con las dos manos 🤌",
  perfetto: "Carpichi contento",
  siesta: "Carpichi durmiendo la siesta",
  compras: "Carpichi con la bolsa de las compras",
  chef: "Carpichi con gorro de chef",
};

/** SVG completo de cada pose. */
export const CARPICHI_SVG: Record<CarpichiPose, string> = {
  // Principal: "¿y esto cuánto sale?" 🤌
  capisci: svg(
    `${feet}${body}${restPaw(84, 168)}${arm(146, 166, 172, 132)}${ears}${face("chill", "skeptic", "smile")}${pinch(174, 132)}`,
    "0 0 210 220",
  ),
  // Algo salió mal: las dos manos.
  "ma-che": svg(
    `${feet}${body}${arm(58, 166, 30, 134)}${arm(146, 166, 174, 134)}${ears}${face("open", "angry", "o")}${pinch(30, 134, true)}${pinch(176, 134)}${sweat}`,
    "-6 0 216 220",
  ),
  // Algo salió bien.
  perfetto: svg(
    `${feet}${body}${restPaw(84, 168)}${arm(146, 166, 160, 136)}${ears}${face("happy", "up", "smile")}${pinch(160, 134)}${sparkle(186, 92)}${sparkle(176, 70, 5)}`,
    "0 0 210 220",
  ),
  // Estados vacíos.
  siesta: svg(
    `${feet}${body}${restPaw(84, 176)}${restPaw(120, 176)}${ears}${face("sleep", "up", "smile")}${zzz}`,
    "0 0 210 220",
  ),
  // Lista de compras.
  compras: svg(
    `${feet}${body}${restPaw(84, 172)}${bag}${restPaw(132, 146)}${ears}${face("chill", "up", "smile")}`,
    "0 0 210 220",
  ),
  // Recetas.
  chef: svg(
    `${feet}${body}${restPaw(84, 168)}${arm(146, 166, 172, 132)}${ears}${face("chill", "skeptic", "smile")}${chefHat}${pinch(174, 132)}`,
    "0 -12 210 232",
  ),
};

// ---------- cabeza sola (lienzo 64 × 64): logo, favicon y avisos ----------
// Formas gruesas, sin contorno, para que se lea a 16 px.

export type CarpichiExpression = "chill" | "ma-che" | "perfetto";

const headEyes: Record<CarpichiExpression, string> = {
  chill: `
  <path d="M19.5 23 h8 M36.5 23 h8" stroke="${C.line}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M21 23 a2.5 2.4 0 0 0 5 0Z M38 23 a2.5 2.4 0 0 0 5 0Z" fill="${C.line}"/>`,
  "ma-che": `
  <path d="M18.5 15.5 l8 3 M45.5 15.5 l-8 3" stroke="${C.line}" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="23.5" cy="24" r="4.4" fill="#fff" stroke="${C.line}" stroke-width="1.8"/>
  <circle cx="40.5" cy="24" r="4.4" fill="#fff" stroke="${C.line}" stroke-width="1.8"/>
  <circle cx="23.5" cy="24.5" r="2.1" fill="${C.line}"/>
  <circle cx="40.5" cy="24.5" r="2.1" fill="${C.line}"/>`,
  perfetto: `<path d="M19.5 25.5 q4 -5.5 8 0 M36.5 25.5 q4 -5.5 8 0" fill="none" stroke="${C.line}" stroke-width="2.6" stroke-linecap="round"/>`,
};

/** Cabeza sola; con `badge` lleva el fondo verde redondeado (favicon / logo). */
export function carpichiHeadSvg(expression: CarpichiExpression = "chill", badge = false): string {
  return svg(
    `${badge ? `<rect width="64" height="64" rx="16" fill="${C.green}"/>` : ""}
  <ellipse cx="17" cy="13" rx="5.5" ry="5" fill="${C.furDark}"/>
  <ellipse cx="47" cy="13" rx="5.5" ry="5" fill="${C.furDark}"/>
  <rect x="11" y="9" width="42" height="50" rx="16" fill="${C.fur}"/>
  <rect x="16" y="31" width="32" height="27" rx="12" fill="${C.light}"/>
  <rect x="23" y="32" width="18" height="8" rx="4" fill="${C.nose}"/>
  ${headEyes[expression]}
  <path d="M32 42 C29 40 24 40 21.5 43 C19 46 15.5 45 15.5 41.5 C14 47 19 51 25 48 C28 46.5 30.5 47.5 32 46
           C33.5 47.5 36 46.5 39 48 C45 51 50 47 48.5 41.5 C48.5 45 45 46 42.5 43 C40 40 35 40 32 42Z" fill="${C.stache}"/>`,
    "0 0 64 64",
  );
}
