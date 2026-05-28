// =============================================================
//  CSV parsing
//
//  Two entry points:
//    parseCsv(text, hostDivision)
//      Detects the format and dispatches. Returns
//      { lifters, warnings, headers, mapping }.
//
//  The standard format expects header-row CSV with columns matching
//  FIELD_ALIASES. The Square Online order export is a tab-separated UTF-16
//  file where the lifter details live inside the Item Modifiers cell as a
//  list of "1 x Question: Answer" segments — we unpack those into proper
//  fields here.
// =============================================================

import Papa from "papaparse";
import { FIELD_ALIASES } from "./constants.js";
import {
  findColumn,
  parseNumber,
  normaliseAgeClass,
  normaliseCompType,
  normaliseWeightClass,
  normaliseOpenIPF,
  tidyName,
} from "./utils.js";

// =============================================================
//  Square Online detector + helpers
// =============================================================

export function isSquareExport(headers) {
  const h = headers.map((x) => x.toLowerCase().trim());
  const hasItemModifiers = h.includes("item modifiers");
  const hasOrder = h.includes("order");
  const hasRecipient = h.includes("recipient name") || h.includes("recipient email");
  return hasItemModifiers && (hasOrder || hasRecipient);
}

// Parse a single Item Modifiers cell into a list of { key, value } pairs.
// Cell shape: "1 x Full name of the lifter: Margot, 1 x Female, 1 x Three lift, 1 x M66, 1 x None"
export function parseSquareModifiers(cell) {
  if (!cell) return [];
  const stripped = cell.replace(/^\s*1\s*x\s*/i, "");
  const parts = stripped.split(/,\s*1\s*x\s*/);
  return parts.map((p) => {
    const trimmed = p.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > -1) {
      return {
        key: trimmed.slice(0, colonIdx).trim(),
        value: trimmed.slice(colonIdx + 1).trim(),
      };
    }
    return { key: null, value: trimmed };
  });
}

function buildLifterFromSquare(row, idx, hostDivision) {
  const modifiers = parseSquareModifiers(row["Item Modifiers"] ?? "");
  let fullName = "";
  let weightClassRaw = null;
  let ageClassRaw = null;
  let compTypeRaw = null;
  let equippedRaw = null;
  let totalRaw = null;
  let isGuest = false;
  let club = null;
  let openIpfRaw = null;
  let instagramRaw = null;

  for (const m of modifiers) {
    const val = (m.value ?? "").trim();
    const keyText = m.key ?? "";

    if (/full name of the lifter/i.test(keyText)) { fullName = val; continue; }
    if (/previous best competition total/i.test(keyText)) { totalRaw = val; continue; }
    if (/state club or team/i.test(keyText)) { club = val; continue; }
    if (/british powerlifting membership/i.test(keyText)) continue; // not stored
    if (/openipf|open ipf|openpowerlifting|opl profile|profile url/i.test(keyText)) { openIpfRaw = val; continue; }
    if (/instagram|ig handle|insta/i.test(keyText)) { instagramRaw = val; continue; }

    // Bare answers (no key).
    if (m.key == null) {
      if (/^[FM]\d+\+?$/i.test(val)) { weightClassRaw = val.toUpperCase(); continue; }
      if (/^(male|female)$/i.test(val)) continue; // sex comes from the weight class
      if (/three lift|sub-junior three lift|powerlifting/i.test(val)) { compTypeRaw = "FULL"; continue; }
      if (/bench only|bench press/i.test(val)) { compTypeRaw = "BENCH"; continue; }
      if (/^classic$/i.test(val)) { equippedRaw = false; continue; }
      if (/^equipped$/i.test(val)) { equippedRaw = true; continue; }
      if (/^sub.?junior$/i.test(val)) { ageClassRaw = "SJ"; continue; }
      if (/^junior$/i.test(val)) { ageClassRaw = "J"; continue; }
      if (/^senior$/i.test(val) || /^open$/i.test(val)) { ageClassRaw = "OPEN"; continue; }
      const masterMatch = val.match(/^masters?\s*(\d)$/i);
      if (masterMatch) { ageClassRaw = `M${masterMatch[1]}`; continue; }
      if (/guest lifter/i.test(val)) { isGuest = true; continue; }
      if (/^yes,?\s*i live in/i.test(val)) continue; // local marker, no action
    }
  }

  const weightClass = normaliseWeightClass(weightClassRaw);
  if (!weightClass) return null;
  if (!fullName) return null;

  // Split full name on the last space so multi-word first names ("Mary Anne")
  // stay with the first-name part rather than the surname.
  const cleaned = tidyName(fullName);
  const lastSpace = cleaned.lastIndexOf(" ");
  const firstName = lastSpace > 0 ? cleaned.slice(0, lastSpace) : cleaned;
  const lastName = lastSpace > 0 ? cleaned.slice(lastSpace + 1) : "";

  let instagram = tidyName(instagramRaw);
  if (instagram && !instagram.startsWith("@")) instagram = "@" + instagram.replace(/^@+/, "");

  return {
    id: `square-${idx}-${(lastName || firstName).replace(/\s+/g, "-")}`,
    firstName,
    lastName,
    weightClass,
    ageClass: ageClassRaw ?? "OPEN",
    compType: compTypeRaw ?? "FULL",
    total: parseNumber(totalRaw),
    glp: null,
    instagram: instagram || null,
    openIpf: normaliseOpenIPF(openIpfRaw),
    division: isGuest ? "Guest" : hostDivision,
    equipped: equippedRaw === true,
    notes: club ? `Club: ${club}` : "",
  };
}

function parseSquareCsv(rows, hostDivision) {
  const lifters = [];
  const warnings = [];
  rows.forEach((row, i) => {
    const lifter = buildLifterFromSquare(row, i, hostDivision);
    if (lifter) {
      lifters.push(lifter);
    } else {
      const orderRef = row["Order"] || `row ${i + 2}`;
      warnings.push(`Skipped ${orderRef}: missing name or weight class.`);
    }
  });
  return { lifters, warnings };
}

// =============================================================
//  Main entry point
// =============================================================

export function parseCsv(text, hostDivision = "YNE") {
  // Strip a leading UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (!parsed.data || parsed.data.length === 0) {
    return { lifters: [], warnings: ["The file appears to be empty."], headers: [] };
  }
  const headers = parsed.meta.fields ?? Object.keys(parsed.data[0]);

  // Branch on format detection.
  if (isSquareExport(headers)) {
    const { lifters, warnings } = parseSquareCsv(parsed.data, hostDivision);
    warnings.unshift(`Detected a Square Online order export. ${lifters.length} entr${lifters.length === 1 ? "y" : "ies"} loaded.`);
    return { lifters, warnings, headers, mapping: { format: "square" } };
  }

  // Standard column-mapped CSV.
  const map = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    map[field] = findColumn(headers, aliases);
  }

  const warnings = [];
  if (!map.firstName && !map.fullName) warnings.push("Could not find a first name or full name column.");
  if (!map.lastName && !map.fullName) warnings.push("Could not find a last name column.");
  if (!map.weightClass) warnings.push("Could not find a weight class column. Entries without a class will be skipped.");

  const lifters = [];
  parsed.data.forEach((row, i) => {
    const get = (key) => (map[key] ? row[map[key]] : null);

    let firstName = tidyName(get("firstName"));
    let lastName = tidyName(get("lastName"));
    if (!firstName && !lastName && map.fullName) {
      const full = tidyName(get("fullName"));
      const lastSpace = full.lastIndexOf(" ");
      firstName = lastSpace > 0 ? full.slice(0, lastSpace) : full;
      lastName = lastSpace > 0 ? full.slice(lastSpace + 1) : "";
    }

    const weightClass = normaliseWeightClass(get("weightClass"));
    if (!weightClass) return; // skip row without class

    const ageClass = normaliseAgeClass(get("ageClass"));
    const compType = normaliseCompType(get("compType"));
    const total = parseNumber(get("total"));
    const glp = parseNumber(get("glp"));
    let instagram = tidyName(get("instagram"));
    if (instagram && !instagram.startsWith("@")) instagram = "@" + instagram.replace(/^@+/, "");
    const openIpf = normaliseOpenIPF(get("openipf"));
    const notesRaw = (get("notes") ?? "").toString();

    // Division: column wins, then a "Guest - X" pattern in notes, then host default.
    let division = tidyName(get("division"));
    if (!division) {
      const m = notesRaw.match(/guest\s*[-:–]\s*([A-Za-z &]+)/i);
      if (m) division = m[1].trim();
    }
    if (!division) division = hostDivision;

    const equippedFlag = (get("equipped") ?? "").toString().toLowerCase();
    const equipped = /eq|equipped|y|yes|true/.test(equippedFlag);

    if (!firstName && !lastName) {
      warnings.push(`Row ${i + 2}: missing name, skipped.`);
      return;
    }

    lifters.push({
      id: `lifter-${i}-${lastName || firstName}`.replace(/\s+/g, "-"),
      firstName,
      lastName,
      weightClass,
      ageClass,
      compType,
      total,
      glp,
      instagram: instagram || null,
      openIpf,
      division,
      equipped,
      notes: notesRaw,
    });
  });

  return { lifters, warnings, headers, mapping: map };
}

// =============================================================
//  Encoding detection
//  Square exports are UTF-16 little-endian; other CSVs are UTF-8 with or
//  without a BOM. Caller passes an ArrayBuffer from FileReader; we return
//  decoded text.
// =============================================================

export function decodeFile(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder("utf-16le").decode(bytes.slice(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder("utf-16be").decode(bytes.slice(2));
  }
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  return new TextDecoder("utf-8").decode(bytes);
}
