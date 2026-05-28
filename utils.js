// =============================================================
//  Pure utility helpers — no React, no DOM, no globals.
// =============================================================

import { AGE_CLASS_MAP, COMP_TYPE_MAP } from "./constants.js";

export const normalise = (s) =>
  (s ?? "").toString().trim().toLowerCase().replace(/[\s_-]+/g, " ");

export function findColumn(headers, aliases) {
  const normHeaders = headers.map((h) => normalise(h));
  for (const alias of aliases) {
    const idx = normHeaders.indexOf(normalise(alias));
    if (idx !== -1) return headers[idx];
  }
  // Loose contains-match as fallback.
  for (const alias of aliases) {
    const a = normalise(alias);
    const idx = normHeaders.findIndex((h) => h.includes(a) && a.length > 2);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function parseNumber(v) {
  if (v === null || v === undefined) return null;
  const s = v.toString().trim().toLowerCase().replace(/kg/g, "").replace(/[,\s]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function normaliseAgeClass(raw) {
  const v = normalise(raw);
  for (const [canon, aliases] of Object.entries(AGE_CLASS_MAP)) {
    if (aliases.includes(v)) return canon;
  }
  return "OPEN";
}

export function normaliseCompType(raw) {
  const v = normalise(raw);
  for (const [canon, aliases] of Object.entries(COMP_TYPE_MAP)) {
    if (aliases.includes(v)) return canon;
  }
  return "FULL";
}

// A lifter's sex is determined by the F or M prefix on their weight class.
// "F63" is a women's 63kg, "M83" is a men's 83kg, "M120+" is men's 120kg+.
// Anything without an F or M prefix can't be placed and is treated as invalid.
export function normaliseWeightClass(raw) {
  if (!raw) return null;
  let s = raw.toString().trim().toUpperCase().replace(/\s+/g, "").replace(/KG/g, "");
  let sex = null;
  if (s.startsWith("F")) { sex = "F"; s = s.slice(1); }
  else if (s.startsWith("M")) { sex = "M"; s = s.slice(1); }
  if (!sex) return null;
  const plus = s.includes("+");
  const num = s.replace("+", "");
  if (!num) return null;
  return `${sex}${num}${plus ? "+" : ""}`;
}

export function tidyName(s) {
  if (!s) return "";
  return s.toString().trim().replace(/\s+/g, " ");
}

export function ageClassSuffix(age) {
  if (age === "OPEN") return "";
  return age;
}

export function classDisplay(cls) {
  if (!cls) return "";
  const m = cls.match(/^([FM])(.+)$/);
  if (!m) return cls;
  return `${m[1]}${m[2]}`;
}

// Normalise an OpenIPF / OpenPowerlifting profile URL. If a lifter has
// pasted an openpowerlifting.org link we rewrite it to openipf.org —
// same path, just the IPF-affiliated subset. Bare usernames like "u/jane-smith"
// or "jane-smith" are also accepted and expanded to a full URL.
// Anything that doesn't look like an OpenIPF URL or a plausible username
// returns null so we don't accidentally create links to other sites.
export function normaliseOpenIPF(raw) {
  if (!raw) return null;
  let s = raw.toString().trim();
  if (!s) return null;
  s = s.replace(/^[<"'\s]+|[>"'\s]+$/g, "");
  s = s.replace(/^https?:\/\/(?:www\.)?openpowerlifting\.org/i, "https://www.openipf.org");
  if (/^(?:www\.)?openipf\.org/i.test(s)) {
    s = "https://www." + s.replace(/^www\./i, "");
  }
  if (/^https?:\/\//i.test(s)) {
    return /openipf\.org/i.test(s) ? s : null;
  }
  // Not a URL — only accept bare usernames (alphanumeric, hyphen, underscore)
  // optionally prefixed with "u/".
  const cleaned = s.replace(/^u\//i, "");
  if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) return null;
  return `https://www.openipf.org/u/${cleaned}`;
}

// Stable but seedable shuffle for "randomise no-total lifters" within a class.
// We want a deterministic order so the same input gives the same output, but
// without sorting by name (which would always favour A-surnames).
export function seededShuffle(arr, seed = 1) {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Format a lifter's name with markers and an optional division bracket.
//   (B) bench only, (E) equipped, (Region) guest from another division
// The division bracket is suppressed when the order view shows a separate
// Division column.
export function formatLifterName(l, opts = {}) {
  const { hostDivision = "YNE", showDivisionColumn = false } = opts;
  const name = `${l.firstName} ${l.lastName}`.trim();
  const markers = [];
  if (l.compType === "BENCH") markers.push("(B)");
  if (l.equipped) markers.push("(E)");
  if (!showDivisionColumn && l.division && l.division !== hostDivision) {
    markers.push(`(${l.division})`);
  }
  return markers.length ? `${name} ${markers.join(" ")}` : name;
}

// =============================================================
//  IPF rule constants
// =============================================================

// Recommended minimum lifters per flight when groups lift at separate times
// (IPF Technical Rulebook 5.7). Used as a soft warning, not a hard cap.
export const RECOMMENDED_MIN_PER_FLIGHT = 8;
// Below this number, compensatory time is added at the end of each round.
export const HARD_MIN_FOR_FULL_TIME = 6;

// Per IPF rule 6.2(d): 5 lifters add 1 minute, 4 lifters add 2 minutes,
// 3 lifters add 3 minutes (the maximum).
export function compensatoryMinutes(lifterCount) {
  if (lifterCount >= HARD_MIN_FOR_FULL_TIME) return 0;
  if (lifterCount === 5) return 1;
  if (lifterCount === 4) return 2;
  if (lifterCount <= 3 && lifterCount > 0) return 3;
  return 0;
}
