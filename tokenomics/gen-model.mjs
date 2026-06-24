// Generates KYRT_Tokenomics.xlsx, a tokenomics calculator (Refer&Earn · Discount · Buyback).
// Real formulas + cached values (opens already calculated). Run: node gen-model.mjs
import ExcelJS from "exceljs";

const OUT = "C:/kerythos/kerythos_kyrt/docs/KYRT_Tokenomics.xlsx";

// ── Global parameters (editable) ────────────────────────────────────────────
const G = {
  supply: 1_000_000_000, price: 0.002, poolPct: 0.15,
  pro: 19, biz: 49, reward: 8, disc: 0.15, buyback: 0.30, burn: 0.50,
  ret: 18, margin: 0.80,
};
G.fdv = G.supply * G.price;
G.pool = G.supply * G.poolPct;

// ── Scenarios (editable) ────────────────────────────────────────────────────
const SC = {
  C: { U: 2000, pay: 0.08, mixPro: 0.80, kyrtPay: 0.20, refer: 0.10 },
  D: { U: 15000, pay: 0.10, mixPro: 0.75, kyrtPay: 0.35, refer: 0.20 },
  E: { U: 60000, pay: 0.12, mixPro: 0.70, kyrtPay: 0.50, refer: 0.30 },
};

function compute(i) {
  const s = { ...i };
  s.payers = i.U * i.pay;
  s.pro = s.payers * i.mixPro;
  s.biz = s.payers * (1 - i.mixPro);
  s.mrr = s.pro * G.pro + s.biz * G.biz;
  s.arr = s.mrr * 12;
  s.arpu = s.mrr / s.payers;
  s.refs = i.U * i.refer;
  s.referCost = s.refs * G.reward;
  s.kyrtDist = s.referCost / G.price;
  s.runway = G.pool / s.kyrtDist;
  s.revKYRT = s.arr * i.kyrtPay;
  s.discCost = s.revKYRT * G.disc;
  s.bb = s.arr * G.buyback;
  s.kyrtBought = s.bb / G.price;
  s.kyrtBurned = s.kyrtBought * G.burn;
  s.deflation = s.kyrtBurned / G.supply;
  s.program = s.referCost + s.discCost;
  s.coverage = s.bb / s.program;
  s.cac = G.reward;
  s.ltv = s.arpu * G.ret * G.margin;
  s.ltvCac = s.ltv / s.cac;
  return s;
}
const S = { C: compute(SC.C), D: compute(SC.D), E: compute(SC.E) };

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Model", { views: [{ state: "frozen", ySplit: 4 }] });
ws.properties.defaultRowHeight = 15;

const NAVY = "FF091E2F", GREEN = "FF00A859", LBLUE = "FFEAF3FF", GREY = "FFF2F5F8";
const BLUE = "FF0000FF";
const fontBase = { name: "Arial", size: 10 };

ws.getColumn("A").width = 40;
["B", "C", "D", "E"].forEach((c) => (ws.getColumn(c).width = 16));

// Title
ws.mergeCells("A1:E1");
ws.getCell("A1").value = "KYRT, Economic Model  ·  Refer&Earn · Discount · Buyback";
ws.getCell("A1").font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left", indent: 1 };
ws.getRow(1).height = 26;
ws.mergeCells("A2:E2");
ws.getCell("A2").value = "Blue = editable input · Black = formula. Adjust the parameters and scenarios; everything recalculates.";
ws.getCell("A2").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF5D7488" } };

function header(row, text) {
  ws.mergeCells(`A${row}:E${row}`);
  const c = ws.getCell(`A${row}`);
  c.value = text;
  c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  c.alignment = { indent: 1 };
}
function label(row, text, indent = 1) {
  const c = ws.getCell(`A${row}`);
  c.value = text;
  c.font = fontBase;
  c.alignment = { indent };
}
function input(addr, val, fmt) {
  const c = ws.getCell(addr);
  c.value = val;
  c.numFmt = fmt;
  c.font = { ...fontBase, color: { argb: BLUE } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LBLUE } };
  c.alignment = { horizontal: "right" };
}
function formula(addr, f, result, fmt, bold = false) {
  const c = ws.getCell(addr);
  c.value = { formula: f, result };
  c.numFmt = fmt;
  c.font = { ...fontBase, bold };
  c.alignment = { horizontal: "right" };
}

// ── Globals ─────────────────────────────────────────────────────────────────
header(4, "GLOBAL PARAMETERS");
const gl = [
  ["Total supply (KYRT)", "B5", G.supply, "#,##0", true],
  ["Target KYRT price (US$)", "B6", G.price, "$0.000000", true],
  ["Implied FDV (US$)", "B7", null, "$#,##0"],
  ["Rewards pool (% of supply)", "B8", G.poolPct, "0.0%", true],
  ["Rewards pool (KYRT)", "B9", null, "#,##0"],
  ["Pro plan (US$/mo)", "B10", G.pro, "$#,##0", true],
  ["Business plan (US$/mo)", "B11", G.biz, "$#,##0", true],
  ["Reward per referral (US$, total)", "B12", G.reward, "$#,##0", true],
  ["Discount when paying plan in KYRT", "B13", G.disc, "0.0%", true],
  ["Revenue allocated to buyback", "B14", G.buyback, "0.0%", true],
  ["Burned share of buyback", "B15", G.burn, "0.0%", true],
  ["Average retention (months)", "B16", G.ret, "0", true],
  ["Gross margin (for LTV)", "B17", G.margin, "0.0%", true],
];
let r = 5;
for (const [lab, addr, val, fmt, isInput] of gl) {
  label(r, lab);
  if (isInput) input(addr, val, fmt);
  r++;
}
formula("B7", "B5*B6", G.fdv, "$#,##0");
formula("B9", "B5*B8", G.pool, "#,##0");

// ── Scenarios (inputs) ──────────────────────────────────────────────────────
header(19, "SCENARIOS  (adjust the scale and rates of each)");
["C", "D", "E"].forEach((L, idx) => {
  const c = ws.getCell(`${L}19`);
  c.value = ["Conservative", "Base", "Aggressive"][idx];
  c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  c.alignment = { horizontal: "center" };
});
const scen = [
  ["Active users", 20, "U", "#,##0"],
  ["% paying", 21, "pay", "0.0%"],
  ["Pro mix (% of payers)", 22, "mixPro", "0.0%"],
  ["% payers paying in KYRT", 23, "kyrtPay", "0.0%"],
  ["% users referring / year", 24, "refer", "0.0%"],
];
for (const [lab, row, key, fmt] of scen) {
  label(row, lab);
  for (const L of ["C", "D", "E"]) input(`${L}${row}`, SC[L][key], fmt);
}

// ── Computed blocks ─────────────────────────────────────────────────────────
header(26, "REVENUE");
header(34, "DISTRIBUTION, Refer & Earn  (tokens going OUT)");
header(40, "SINK & BUYBACK  (tokens coming BACK / burned)");
header(48, "READOUT, Sustainability & Unit Economics");

const calc = [
  [27, "Payers", "#,##0", (L) => `${L}20*${L}21`, "payers"],
  [28, "   Pro (units)", "#,##0", (L) => `${L}27*${L}22`, "pro"],
  [29, "   Business (units)", "#,##0", (L) => `${L}27*(1-${L}22)`, "biz"],
  [30, "MRR, monthly revenue (US$)", "$#,##0", (L) => `${L}28*$B$10+${L}29*$B$11`, "mrr"],
  [31, "ARR, annual revenue (US$)", "$#,##0", (L) => `${L}30*12`, "arr"],
  [32, "ARPU (US$/mo)", "$#,##0.00", (L) => `${L}30/${L}27`, "arpu"],
  [35, "Successful referrals / year", "#,##0", (L) => `${L}20*${L}24`, "refs"],
  [36, "Refer&Earn cost / year (US$)", "$#,##0", (L) => `${L}35*$B$12`, "referCost"],
  [37, "KYRT distributed / year", "#,##0", (L) => `${L}36/$B$6`, "kyrtDist"],
  [38, "Rewards pool runway (years)", '0.0"  years"', (L) => `$B$9/${L}37`, "runway"],
  [41, "Revenue paid in KYRT / year (US$)", "$#,##0", (L) => `${L}31*${L}23`, "revKYRT"],
  [42, "Discount cost / year (US$)", "$#,##0", (L) => `${L}41*$B$13`, "discCost"],
  [43, "Buyback / year (US$)", "$#,##0", (L) => `${L}31*$B$14`, "bb"],
  [44, "KYRT bought back / year", "#,##0", (L) => `${L}43/$B$6`, "kyrtBought"],
  [45, "KYRT burned / year", "#,##0", (L) => `${L}44*$B$15`, "kyrtBurned"],
  [46, "Annual deflation (% of supply)", "0.00%", (L) => `${L}45/$B$5`, "deflation"],
  [49, "Incentive program cost / year (US$)", "$#,##0", (L) => `${L}36+${L}42`, "program"],
  [50, "Coverage, buyback / program", '0.0"x"', (L) => `${L}43/${L}49`, "coverage", true],
  [51, "CAC per acquired user (US$)", "$#,##0.00", () => `$B$12`, "cac"],
  [52, "LTV per user (US$)", "$#,##0", (L) => `${L}32*$B$16*$B$17`, "ltv"],
  [53, "LTV / CAC", '0.0"x"', (L) => `${L}52/${L}51`, "ltvCac", true],
];
for (const [row, lab, fmt, fFn, key, bold] of calc) {
  label(row, lab);
  for (const L of ["C", "D", "E"]) formula(`${L}${row}`, fFn(L), S[L][key], fmt, bold);
}

// grey band on summary rows
[38, 46, 50, 53].forEach((row) => {
  for (const col of ["A", "C", "D", "E"]) {
    ws.getCell(`${col}${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
  }
});

// ── Notes sheet ─────────────────────────────────────────────────────────────
const wl = wb.addWorksheet("How to read");
wl.getColumn("A").width = 100;
const notes = [
  ["How to read this model", "h"],
  ["Everything in BLUE is editable. Change the global parameters and the 3 scenarios; the formulas recalculate.", ""],
  ["", ""],
  ["Health signals", "h"],
  ["• LTV / CAC > 3x  → the referral incentive pays for itself with room to spare (here it's usually VERY high → you can afford to be more generous).", ""],
  ["• Coverage (buyback / program) > 1x  → revenue buys back more than the incentive costs (the program is self-sustaining).", ""],
  ["• Rewards pool runway > 3–5 years  → the emission cap (pool) doesn't run out too early.", ""],
  ["• Healthy annual deflation, but not absurd (if KYRT bought back/year > pool, the price rises and the static model overstates it).", ""],
  ["", ""],
  ["Honest caveats", "h"],
  ["• STATIC model: the KYRT price actually reacts to the buyback (it rises), so in US$ the buyback repurchases FEWER tokens than shown. Treat the KYRT side as a ceiling.", ""],
  ["• Pre-market, distributed KYRT is a LIABILITY (a promise), not a cash cost, it becomes a real cost only once there's liquidity. The pool must back the off-chain balances.", ""],
  ["• 'Paying in KYRT' assumes the user ALREADY earned KYRT (Refer&Earn). That's the flywheel: distribute → spend.", ""],
  ["", ""],
  ["Open decisions (set them and see the impact)", "h"],
  ["1. Reward per referral (B12), with LTV/CAC this high, you can raise it. By how much?", ""],
  ["2. Discount for paying the plan in KYRT (B13), incentive vs. margin.", ""],
  ["3. Rewards pool / emission cap (B8), share of supply reserved for distribution.", ""],
  ["4. Does paying the plan BURN the KYRT or return it to the treasury? (changes deflation, see row 45).", ""],
  ["5. Target price (B6), drives the whole KYRT side; it's a reference, the market decides.", ""],
];
let lr = 1;
for (const [txt, kind] of notes) {
  const c = wl.getCell(`A${lr}`);
  c.value = txt;
  if (kind === "h") {
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  } else {
    c.font = { name: "Arial", size: 10 };
    c.alignment = { wrapText: true };
  }
  lr++;
}

await wb.xlsx.writeFile(OUT);

// console sanity check
const f = (n) => Math.round(n).toLocaleString("en-US");
for (const L of ["C", "D", "E"]) {
  const s = S[L];
  console.log(`\n[${{ C: "Conservative", D: "Base", E: "Aggressive" }[L]}]  ${f(s.U)} users`);
  console.log(`  ARR=$${f(s.arr)} | Refer&Earn=$${f(s.referCost)}/yr (${f(s.kyrtDist)} KYRT) | runway=${s.runway.toFixed(1)} yrs`);
  console.log(`  Buyback=$${f(s.bb)} | coverage=${s.coverage.toFixed(1)}x | LTV/CAC=${s.ltvCac.toFixed(1)}x | deflation=${(s.deflation * 100).toFixed(2)}%`);
}
console.log(`\nDone: ${OUT}`);
