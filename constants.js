// =============================================================
//  IPF reference data
//  Class lists, age categories, comp types, CSV column aliases,
//  and a small sample dataset used when no CSV is loaded.
// =============================================================

// Canonical class orders, lightest first within each sex.
export const WOMEN_CLASSES = ["F43", "F47", "F52", "F57", "F63", "F69", "F76", "F84", "F84+"];
export const MEN_CLASSES   = ["M53", "M59", "M66", "M74", "M83", "M93", "M105", "M120", "M120+"];

// Default flight order: women's classes first, then men's. Other modes are
// available via the `flightOrder` setting — see weightClassOrder().
export const WEIGHT_CLASS_ORDER = [...WOMEN_CLASSES, ...MEN_CLASSES];

// Return the weight classes in the requested order.
//   "women-first": F lightest → F heaviest, M lightest → M heaviest (default)
//   "men-first":   M lightest → M heaviest, F lightest → F heaviest
//   "ascending":   sex-agnostic, ordered by numeric weight. F84 and F84+ group
//                  with M83/M93 territory rather than ending the sweep.
export function weightClassOrder(mode = "women-first") {
  if (mode === "men-first") return [...MEN_CLASSES, ...WOMEN_CLASSES];
  if (mode === "ascending") {
    const all = [...WOMEN_CLASSES, ...MEN_CLASSES];
    return all.sort((a, b) => {
      const numA = parseInt(a.replace(/^[FM]/, ""), 10);
      const numB = parseInt(b.replace(/^[FM]/, ""), 10);
      if (numA !== numB) return numA - numB;
      if (a[0] !== b[0]) return a[0] === "F" ? -1 : 1;
      const aPlus = a.endsWith("+");
      const bPlus = b.endsWith("+");
      if (aPlus !== bPlus) return aPlus ? 1 : -1;
      return 0;
    });
  }
  return WEIGHT_CLASS_ORDER;
}

// canonical → list of accepted strings (lower-cased, normalised)
export const AGE_CLASS_MAP = {
  SJ:   ["sj", "sub-junior", "sub junior", "subjunior", "sub-j", "sub jr"],
  J:    ["j", "jr", "junior", "jnr"],
  OPEN: ["open", "o", "snr", "senior", ""],
  M1:   ["m1", "master 1", "master1", "masters 1", "masters1"],
  M2:   ["m2", "master 2", "master2", "masters 2", "masters2"],
  M3:   ["m3", "master 3", "master3", "masters 3", "masters3"],
  M4:   ["m4", "master 4", "master4", "masters 4", "masters4"],
};

export const COMP_TYPE_MAP = {
  FULL:  ["full power", "fullpower", "full-power", "fp", "powerlifting", "pl", "3-lift", "three lift"],
  BENCH: ["bench only", "bench-only", "benchonly", "bench", "bo", "b", "single bench"],
};

// CSV header aliases for fuzzy column matching.
export const FIELD_ALIASES = {
  firstName:   ["first name", "firstname", "first", "given name", "forename"],
  lastName:    ["last name", "lastname", "surname", "family name", "last"],
  fullName:    ["name", "full name", "lifter", "lifter name", "athlete"],
  weightClass: ["weight class", "weightclass", "class", "wc", "bodyweight class", "category"],
  ageClass:    ["age class", "ageclass", "age category", "age cat", "age", "age group", "age division"],
  compType:    ["comp type", "type", "competition type", "event type", "lift type", "discipline"],
  total:       ["total", "best total", "best total (12mo)", "nominated total", "qualifying total", "previous total", "12 month total", "12mo total"],
  glp:         ["glp", "gl", "gl points", "ipf gl", "ipf points", "goodlift", "good lift", "ipf glp", "ipf gl points", "openipf glp", "glp points"],
  instagram:   ["instagram", "ig", "ig handle", "insta", "@", "social", "handle"],
  openipf:     ["openipf", "openipf profile", "openipf url", "openipf link", "profile", "profile url", "openpowerlifting", "openpowerlifting url", "opl", "opl url"],
  division:    ["division", "div", "home division", "fed", "federation", "home federation", "home nation", "region", "guest region"],
  equipped:    ["equipped", "raw/eq", "raw or equipped", "eq"],
  notes:       ["notes", "comments", "remarks"],
};

// Sample lifters used when no CSV is loaded. Names are entirely fictional.
// A mix of: with/without Instagram, with/without OpenIPF profile, with/without
// total, with/without division (guests). Designed to exercise every render path.
export const SAMPLE_LIFTERS = [
  { firstName: "Margot",   lastName: "Hawthorne",        weightClass: "F63",   ageClass: "J",    compType: "FULL",  total: 305,   glp: 76.1,  instagram: "@margot.lifts", openIpf: "https://www.openipf.org/u/margothawthorne" },
  { firstName: "Ines",     lastName: "Velazquez-Brand",  weightClass: "F63",   ageClass: "J",    compType: "FULL",  total: 287.5, glp: 72.4 },
  { firstName: "Petra",    lastName: "Olufsen",          weightClass: "F63",   ageClass: "OPEN", compType: "FULL",  total: null,  glp: null,  instagram: "@petra_strength" },
  { firstName: "Wenona",   lastName: "Brixton",          weightClass: "F76",   ageClass: "OPEN", compType: "FULL",  total: 357.5, glp: 82.3,  instagram: "@wenona.b", openIpf: "https://www.openipf.org/u/wenonabrixton" },
  { firstName: "Tessa",    lastName: "Pemberton",        weightClass: "F84",   ageClass: "OPEN", compType: "FULL",  total: 402.5, glp: 89.5 },
  { firstName: "Roisin",   lastName: "Tamborra",         weightClass: "F84+",  ageClass: "M2",   compType: "FULL",  total: 420,   glp: 91.8,  division: "Wales", instagram: "@roisin.lifts", openIpf: "https://www.openipf.org/u/roisintamborra" },
  { firstName: "Eitan",    lastName: "Holzer-Vasquez",   weightClass: "M74",   ageClass: "OPEN", compType: "FULL",  total: 665,   glp: 94.5 },
  { firstName: "Jovani",   lastName: "Mardenborough",    weightClass: "M83",   ageClass: "OPEN", compType: "FULL",  total: 720,   glp: 98.2,  instagram: "@jovani.m", openIpf: "https://www.openipf.org/u/jovanimardenborough" },
  { firstName: "Pelle",    lastName: "Sjöberg",          weightClass: "M83",   ageClass: "OPEN", compType: "FULL",  total: 720,   glp: 98.5 },
  { firstName: "Rasmus",   lastName: "Edevane",          weightClass: "M93",   ageClass: "OPEN", compType: "FULL",  total: 780,   glp: 99.8,  instagram: "@rasmus.e", openIpf: "https://www.openipf.org/u/rasmusedevane" },
  { firstName: "Vidar",    lastName: "Knausgaard",       weightClass: "M93",   ageClass: "OPEN", compType: "FULL",  total: 790,   glp: 100.2 },
  { firstName: "Xerxes",   lastName: "Polychronos",      weightClass: "M93",   ageClass: "OPEN", compType: "BENCH", total: null,  glp: null },
  { firstName: "Brennus",  lastName: "Cartwright",       weightClass: "M105",  ageClass: "OPEN", compType: "FULL",  total: 845,   glp: 103.1, instagram: "@brennus.c", openIpf: "https://www.openipf.org/u/brennuscartwright" },
  { firstName: "Caelum",   lastName: "Drummond-Hay",     weightClass: "M105",  ageClass: "M1",   compType: "FULL",  total: 792.5, glp: 99.5,  division: "NW" },
  { firstName: "Gawain",   lastName: "Tindall-Brooke",   weightClass: "M120",  ageClass: "OPEN", compType: "FULL",  total: 910,   glp: 104.5, instagram: "@gawain.tb" },
  { firstName: "Iolanthe", lastName: "Sterling",         weightClass: "M120+", ageClass: "OPEN", compType: "FULL",  total: 925,   glp: 103.8, openIpf: "https://www.openipf.org/u/iolanthesterling" },
].map((l, i) => ({
  id: `sample-${i}`,
  equipped: false,
  instagram: l.instagram ?? null,
  openIpf: l.openIpf ?? null,
  division: l.division ?? "YNE",
  ...l,
}));
