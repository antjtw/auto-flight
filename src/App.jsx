// =============================================================
//  AutoFlight — IPF-compliant flight order builder
//  Top-level component: holds state, file upload, settings UI,
//  share, print, dark-mode toggle.
// =============================================================

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Upload, FileText, Share2, Trash2, X, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Copy, Printer, Sun, Moon,
} from "lucide-react";

import "./theme.css";

import { SAMPLE_LIFTERS } from "./constants.js";
import {
  RECOMMENDED_MIN_PER_FLIGHT,
  formatLifterName,
  classDisplay,
} from "./utils.js";
import { parseCsv, decodeFile } from "./parseCsv.js";
import { buildFlights } from "./buildFlights.js";
import { LiftingOrderView } from "./LiftingOrderView.jsx";
import { Pill, Toggle } from "./primitives.jsx";

// =============================================================
//  Theme hook — light / dark with localStorage persistence
// =============================================================

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "auto";
    return localStorage.getItem("autoflight-theme") ?? "auto";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try { localStorage.setItem("autoflight-theme", theme); } catch (e) { /* ignore */ }
  }, [theme]);

  return [theme, setTheme];
}

// =============================================================
//  Main app
// =============================================================

export default function App() {
  const [theme, setTheme] = useTheme();

  const [lifters, setLifters] = useState(SAMPLE_LIFTERS);
  const [warnings, setWarnings] = useState([]);
  const [eventName, setEventName] = useState("Spring Open 2026");
  const [eventDate, setEventDate] = useState("Saturday 18 April 2026");
  const [eventBlurb, setEventBlurb] = useState("");
  const [hostDivision, setHostDivision] = useState("YNE");
  const [fileName, setFileName] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const fileInputRef = useRef(null);
  const printRef = useRef(null);

  const [settings, setSettings] = useState({
    sortBy: "total",
    showTotal: true,
    showGLP: false,
    showDivision: false,
    splitByType: false,
    separateSexes: false,
    separateClasses: false,
    balanceEvenly: true,
    flightOrder: "women-first",
    days: 1,
    flightsPerSession: 2,
    targetSessionsPerDay: null,
  });

  const { sessions, error: buildError, requiredFlightCount, totalSessions } = useMemo(
    () => buildFlights(lifters, settings),
    [lifters, settings]
  );

  // Restore shared state from the URL hash if present.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#data=")) {
      try {
        const raw = decodeURIComponent(hash.slice(6));
        const decoded = JSON.parse(atob(raw));
        if (decoded.lifters) setLifters(decoded.lifters);
        if (decoded.settings) setSettings((s) => ({ ...s, ...decoded.settings }));
        if (decoded.eventName) setEventName(decoded.eventName);
        if (decoded.eventDate) setEventDate(decoded.eventDate);
        if (decoded.eventBlurb) setEventBlurb(decoded.eventBlurb);
        if (decoded.hostDivision) setHostDivision(decoded.hostDivision);
      } catch (e) {
        // ignore corrupt hash
      }
    }
  }, []);

  // ---------- File handling ----------

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = decodeFile(e.target.result);
        const { lifters: parsed, warnings: w } = parseCsv(text, hostDivision);
        setLifters(parsed.map((l, i) => ({ ...l, id: l.id || `csv-${i}` })));
        setWarnings(w);
        setEntriesOpen(true);
      } catch (err) {
        setWarnings([`Could not read the file: ${err.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function loadSample() {
    setLifters(SAMPLE_LIFTERS);
    setWarnings([]);
    setFileName(null);
  }

  function removeLifter(id) {
    setLifters((ls) => ls.filter((l) => l.id !== id));
  }

  // ---------- Share / export ----------

  function generateShareUrl() {
    try {
      const payload = { lifters, settings, eventName, eventDate, eventBlurb, hostDivision };
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}${window.location.pathname}#data=${encoded}`;
      setShareUrl(url);
      navigator.clipboard?.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    } catch (e) {
      setWarnings(["Could not generate share link: " + e.message]);
    }
  }

  function exportPDF() {
    window.print();
  }

  // ---------- Derived ----------

  const totalLifters = lifters.length;
  const fpCount = lifters.filter((l) => l.compType === "FULL").length;
  const boCount = totalLifters - fpCount;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-default)]">

      {/* ===================== Top bar — rust ===================== */}
      <header className="bg-[var(--accent)] text-[var(--text-on-accent)] no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="wordmark text-2xl tracking-tighter">AUTO</span>
            <span className="wordmark text-2xl tracking-tighter font-serif italic" style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600 }}>
              Flight
            </span>
            <span className="ml-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hidden sm:inline">
              Powerlifting flight order builder
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white text-[var(--accent)] hover:bg-white/90 font-semibold transition shadow-sm"
              title="Opens your browser's print dialog. Choose 'Save as PDF' to save."
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Save as PDF</span>
            </button>
            <button
              onClick={generateShareUrl}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-hover)] text-white hover:bg-[var(--accent-pressed)] border border-white/20 transition"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{shareCopied ? "Copied!" : "Share link"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================== Body ===================== */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* -------- Sidebar -------- */}
        <aside className="space-y-6 no-print">

          {/* Entries */}
          <Section title="Entries" badge={<Pill tone="neutral">{totalLifters}</Pill>}>
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="block border-2 border-dashed border-[var(--border-strong)] p-4 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-faint)] transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Upload className="w-5 h-5 mx-auto mb-2 text-[var(--text-subdued)]" />
              <div className="text-xs text-[var(--text-default)] font-medium">
                {fileName ? fileName : "Drop CSV or click to upload"}
              </div>
              <div className="text-[10px] text-[var(--text-subdued)] mt-1">
                Standard CSV or Square Online export
              </div>
            </label>

            <div className="flex items-center justify-between text-xs text-[var(--text-subdued)] mt-3">
              <span>
                {fpCount} full power
                {boCount > 0 && `, ${boCount} bench only`}
              </span>
              <button
                onClick={loadSample}
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium underline-offset-2 hover:underline"
              >
                Load sample
              </button>
            </div>

            {warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`text-[11px] px-2 py-1 flex items-start gap-1.5 ${
                      w.startsWith("Detected")
                        ? "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]"
                        : "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]"
                    }`}
                  >
                    {w.startsWith("Detected")
                      ? <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      : <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {shareUrl && (
              <div className="mt-3 p-2 bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success-text)] text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-2 py-1 text-[10px] bg-white border border-[var(--success-border)] truncate text-[var(--text-default)]"
                />
                <button
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
                  className="px-2 py-1 bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
                  title="Copy"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </Section>

          {/* Event details */}
          <Section title="Event details">
            <div className="space-y-3">
              <LabelledInput label="Event name" value={eventName} onChange={setEventName} />
              <LabelledInput label="Date" value={eventDate} onChange={setEventDate} />
              <LabelledInput
                label="Host division"
                value={hostDivision}
                onChange={(v) => setHostDivision(v.toUpperCase())}
                placeholder="YNE"
                hint="Short code for the division hosting this event. Lifters from other divisions are treated as guests."
                uppercase
              />
              <label className="block">
                <div className="text-xs font-medium text-[var(--text-default)] mb-1">Notes (optional)</div>
                <textarea
                  value={eventBlurb}
                  onChange={(e) => setEventBlurb(e.target.value)}
                  placeholder="Weigh-in times, venue, organiser…"
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm bg-[var(--bg-card)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none resize-none text-[var(--text-default)]"
                />
              </label>
            </div>
          </Section>

          {/* Display settings */}
          <CollapsibleSection
            title="Display settings"
            open={settingsOpen}
            onToggle={() => setSettingsOpen(!settingsOpen)}
          >
            {/* Sort metric */}
            <div className="mb-4">
              <div className="text-[11px] font-medium text-[var(--text-subdued)] mb-2 uppercase tracking-wider">
                Sort lifters within class by
              </div>
              <SegmentedControl
                value={settings.sortBy}
                onChange={(v) => setSettings((s) => ({ ...s, sortBy: v, showGLP: v === "glp" ? true : s.showGLP }))}
                options={[
                  { value: "total", label: "Total" },
                  { value: "glp", label: "GL points" },
                ]}
              />
            </div>

            {/* Columns */}
            <SettingsBlockHeader>Columns</SettingsBlockHeader>
            <Toggle label="Show total" checked={settings.showTotal} onChange={(v) => setSettings((s) => ({ ...s, showTotal: v }))} />
            <Toggle label="Show GL points" checked={settings.showGLP} onChange={(v) => setSettings((s) => ({ ...s, showGLP: v }))} />
            <Toggle
              label="Show division column"
              hint="Adds a per-lifter division column. The bracketed code disappears from names when on."
              checked={settings.showDivision}
              onChange={(v) => setSettings((s) => ({ ...s, showDivision: v }))}
            />

            <Divider />

            {/* Grouping */}
            <SettingsBlockHeader>Flight grouping</SettingsBlockHeader>

            <div className="text-[10px] font-medium text-[var(--text-subdued)] mt-1 mb-1.5 uppercase tracking-wider">
              Class order
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { value: "women-first", label: "Women first", title: "Women's classes first, then men's. Each sex lightest to heaviest." },
                { value: "men-first", label: "Men first", title: "Men's classes first, then women's. Each sex lightest to heaviest." },
                { value: "ascending", label: "Ascending", title: "Strict ascending body weight. Classes interleave." },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSettings((s) => ({ ...s, flightOrder: o.value }))}
                  className={`px-2 py-1.5 text-xs border transition ${
                    settings.flightOrder === o.value
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                  }`}
                  title={o.title}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <Toggle
              label="Don't mix weight classes"
              hint="Each weight class gets its own flight or flights. Implies separate sexes."
              checked={settings.separateClasses}
              onChange={(v) => setSettings((s) => ({ ...s, separateClasses: v, separateSexes: v || s.separateSexes }))}
            />
            <Toggle
              label="Don't mix sexes"
              hint="Men's and women's classes never share a flight."
              checked={settings.separateSexes || settings.separateClasses}
              onChange={(v) => setSettings((s) => ({ ...s, separateSexes: v, separateClasses: v ? s.separateClasses : false }))}
            />
            <Toggle
              label="Separate bench-only flights"
              hint="By default, bench-only lifters sit at the bottom of mixed flights up to 20 total."
              checked={settings.splitByType}
              onChange={(v) => setSettings((s) => ({ ...s, splitByType: v }))}
            />
            <Toggle
              label="Distribute lifters evenly"
              hint="22 M93 lifters become 11+11 rather than 14+8. Caps of 14 full-power and 20 total are never breached."
              checked={settings.balanceEvenly}
              onChange={(v) => setSettings((s) => ({ ...s, balanceEvenly: v }))}
            />

            <Divider />

            {/* Days, sessions and flights */}
            <SettingsBlockHeader>Days, sessions and flights</SettingsBlockHeader>
            <div className="text-[11px] text-[var(--text-subdued)] mb-3 leading-snug">
              {requiredFlightCount > 0
                ? `Your entries need ${requiredFlightCount} flight${requiredFlightCount === 1 ? "" : "s"}, working out to ${totalSessions} session${totalSessions === 1 ? "" : "s"} across ${settings.days} day${settings.days === 1 ? "" : "s"}.`
                : "Add lifters to see how many flights you need."}
            </div>

            <div className="text-[10px] font-medium text-[var(--text-subdued)] mb-1.5 uppercase tracking-wider">Competition days</div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setSettings((s) => ({ ...s, days: n }))}
                  className={`px-2 py-1.5 text-sm border transition ${
                    settings.days === n
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {n === 1 ? "1 day" : `${n} days`}
                </button>
              ))}
            </div>

            <div className="text-[10px] font-medium text-[var(--text-subdued)] mb-1.5 uppercase tracking-wider">Flights per session</div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setSettings((s) => ({ ...s, flightsPerSession: n }))}
                  className={`px-2 py-1.5 text-sm border transition ${
                    settings.flightsPerSession === n
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="text-[10px] font-medium text-[var(--text-subdued)] mb-1.5 uppercase tracking-wider">Sessions per day</div>
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setSettings((s) => ({ ...s, targetSessionsPerDay: null }))}
                className={`flex-1 px-2 py-1.5 text-xs border transition ${
                  settings.targetSessionsPerDay == null
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, targetSessionsPerDay: s.targetSessionsPerDay ?? 2 }))}
                className={`flex-1 px-2 py-1.5 text-xs border transition ${
                  settings.targetSessionsPerDay != null
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                Set manually
              </button>
            </div>
            {settings.targetSessionsPerDay != null && (
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSettings((s) => ({ ...s, targetSessionsPerDay: n }))}
                    className={`px-2 py-1.5 text-sm border transition ${
                      settings.targetSessionsPerDay === n
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Edit entries */}
          {totalLifters > 0 && (
            <CollapsibleSection
              title="Edit entries"
              badge={<Pill tone="neutral">{totalLifters}</Pill>}
              open={entriesOpen}
              onToggle={() => setEntriesOpen(!entriesOpen)}
            >
              <div className="max-h-96 overflow-y-auto -mx-4 border-t border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                {lifters.map((l) => (
                  <div key={l.id} className="px-4 py-2 text-xs hover:bg-[var(--bg-subtle)] group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text-default)] truncate">
                          {formatLifterName(l, { hostDivision, showDivisionColumn: false })}
                        </div>
                        <div className="text-[var(--text-subdued)] mt-0.5">
                          {classDisplay(l.weightClass)} · {l.ageClass} · {l.compType === "BENCH" ? "Bench" : "Full Power"}
                          {l.total != null && ` · ${l.total}kg`}
                        </div>
                      </div>
                      <button
                        onClick={() => removeLifter(l.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 text-[var(--text-subdued)] hover:text-[var(--danger-text)]"
                        title={`Remove ${l.firstName} ${l.lastName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </aside>

        {/* -------- Main content -------- */}
        <section>
          {buildError && (
            <div className="mb-4 p-4 bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">Session and flight setup doesn't fit</div>
                <div className="text-sm leading-relaxed">{buildError.message}</div>
              </div>
            </div>
          )}
          <div ref={printRef} className="bg-[var(--bg-paper)] p-8 shadow-[var(--shadow-card)] print-area">
            <LiftingOrderView
              sessions={sessions}
              settings={settings}
              eventName={eventName}
              eventDate={eventDate}
              eventBlurb={eventBlurb}
              hostDivision={hostDivision}
            />
          </div>

          <div className="mt-4 text-xs text-[var(--text-subdued)]">
            <details>
              <summary className="cursor-pointer hover:text-[var(--text-default)]">How the order is built</summary>
              <ul className="mt-2 ml-4 space-y-1 list-disc leading-relaxed">
                <li>Lifters are grouped by weight class. {settings.flightOrder === "men-first" ? "Men's classes come before women's, each from lightest to heaviest." : settings.flightOrder === "ascending" ? "Classes are ordered by ascending body weight, interleaving women and men (F47, F52, M53, F57, M59…)." : "Women's classes come before men's, from lightest to heaviest."} The weight class (FXX or MXX) is the authoritative marker of competition category — a lifter's recorded sex on any other form doesn't override it.</li>
                <li>Within each class, lifters are ordered by their nominated {settings.sortBy === "total" ? "total" : "GL points"}, heaviest first. Lifters with no nominated value go to the bottom of their class in a randomised order.</li>
                <li>Bench-only lifters always sit at the bottom of the flight they share with full-power lifters.</li>
                <li>Each flight holds up to 14 full-power lifters, or up to 20 in total when bench-only is mixed in. Bench-only-only flights can hold up to 20.</li>
                <li>Markers: (B) bench only, (E) equipped. {settings.showDivision ? "The division column shows each lifter's home division." : `A division code in parentheses (e.g. Wales, NW) marks a guest lifter. Host division is ${hostDivision}.`} Age suffix shown for SJ, J, M1, M2, M3, M4. Open lifters have no suffix.</li>
                <li>Where a lifter has linked their OpenIPF profile, their name is a clickable link. OpenPowerlifting links are auto-corrected to OpenIPF.</li>
                <li>{settings.separateClasses ? "Weight classes are kept in separate flights." : settings.separateSexes ? "Men and women are kept in separate flights." : "Weight classes and sexes can share a flight where capacity allows."} {settings.balanceEvenly ? "Where a group needs more than one flight, lifters are distributed evenly across them." : "Lifters fill flights to the cap before opening a new one."}</li>
                <li>{settings.days > 1 ? `Sessions are distributed across ${settings.days} days, with earlier days taking any extras when the count isn't even.` : "All sessions run on a single day."}</li>
                <li>Recommended minimum {RECOMMENDED_MIN_PER_FLIGHT} lifters per flight (IPF rule 5.7). Below 6 lifters, the speaker must add compensatory time at the end of each round: 1 minute for 5 lifters, 2 for 4, 3 for 3 or fewer (rule 6.2(d)). Flights below the minimum are flagged.</li>
              </ul>
            </details>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-xs text-[var(--text-subdued)] border-t border-[var(--border-default)] mt-12 space-y-1.5 no-print">
        <div>
          Built by Ant{" "}
          <span className="text-[var(--accent)] font-medium">#FFF</span>
          <span className="mx-1.5">·</span>
          <a
            href="https://instagram.com/shred.kemper"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-default)] hover:text-[var(--accent)] transition underline decoration-[var(--accent)] decoration-1 underline-offset-[3px]"
          >
            @shred.kemper
          </a>
          <span className="mx-1.5">·</span>
          for the YNEPF.
        </div>
        <div>Built to the IPF Technical Rulebook (2026) flight and ordering conventions. Always check final orders against your federation's published rules.</div>
      </footer>
    </div>
  );
}

// =============================================================
//  Layout primitives — kept inline since they're only used here.
// =============================================================

function Section({ title, badge, children }) {
  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-default)] border-t-[3px] border-t-[var(--accent)] shadow-[var(--shadow-card)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="font-semibold text-sm tracking-tight">{title}</div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CollapsibleSection({ title, badge, open, onToggle, children }) {
  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-default)] border-t-[3px] border-t-[var(--accent)] shadow-[var(--shadow-card)]">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 border-b border-[var(--border-default)] font-semibold text-sm flex items-center justify-between tracking-tight"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

function SettingsBlockHeader({ children }) {
  return (
    <div className="text-[11px] font-semibold text-[var(--text-default)] uppercase tracking-wider mb-1.5">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border-default)] my-3" />;
}

function LabelledInput({ label, value, onChange, placeholder, hint, uppercase }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--text-default)] mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-1.5 text-sm bg-[var(--bg-card)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none text-[var(--text-default)] ${uppercase ? "uppercase" : ""}`}
      />
      {hint && <div className="text-[11px] text-[var(--text-subdued)] mt-1 leading-snug">{hint}</div>}
    </label>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 text-sm border transition ${
            value === o.value
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "bg-[var(--bg-card)] border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================
//  Theme toggle — sun/moon
// =============================================================

function ThemeToggle({ theme, setTheme }) {
  // Cycle: auto → light → dark → auto
  const isLight = theme === "light";
  const isDark = theme === "dark";
  const next = isLight ? "dark" : isDark ? "auto" : "light";
  const label = isLight ? "Switch to dark" : isDark ? "Switch to auto" : "Switch to light";

  return (
    <button
      onClick={() => setTheme(next)}
      className="inline-flex items-center justify-center w-9 h-9 bg-[var(--accent-hover)] hover:bg-[var(--accent-pressed)] text-white transition border border-white/20"
      title={`${label} (currently ${theme})`}
      aria-label={label}
    >
      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
