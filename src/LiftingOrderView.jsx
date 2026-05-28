// =============================================================
//  LiftingOrderView
//  Renders the order document. Used on screen and inside the print area.
// =============================================================

import React from "react";
import { AlertCircle, Instagram } from "lucide-react";
import {
  RECOMMENDED_MIN_PER_FLIGHT,
  ageClassSuffix,
  classDisplay,
  formatLifterName,
} from "./utils.js";

export function LiftingOrderView({
  sessions,
  settings,
  eventName,
  eventDate,
  eventBlurb,
  hostDivision,
}) {
  const showDivisionColumn = settings.showDivision;

  // Group sessions by day. Empty sessions (no flights assigned) are hidden —
  // the settings panel already reports the totals.
  const nonEmpty = sessions.filter((s) => s.flights.length > 0);
  const maxDay = nonEmpty.reduce((m, s) => Math.max(m, s.day ?? 1), 1);
  const sessionsByDay = new Map();
  for (const s of nonEmpty) {
    const d = s.day ?? 1;
    if (!sessionsByDay.has(d)) sessionsByDay.set(d, []);
    sessionsByDay.get(d).push(s);
  }

  return (
    <div>
      {/* ----- Event header ----- */}
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--accent)] mb-3">
          Lifting Order
        </div>
        <h1 className="font-serif text-5xl md:text-6xl leading-[0.95] text-[var(--text-default)] tracking-tight">
          {eventName || "Untitled competition"}
        </h1>
        {eventDate && (
          <div className="mt-3 text-base text-[var(--text-subdued)]">{eventDate}</div>
        )}
        {eventBlurb && (
          <div className="mt-2 text-sm text-[var(--text-subdued)] max-w-2xl leading-relaxed">
            {eventBlurb}
          </div>
        )}
        <div className="mt-5 h-1 bg-[var(--accent)] w-24" />
      </header>

      {nonEmpty.length === 0 && (
        <div className="text-[var(--text-subdued)] italic">No lifters to display.</div>
      )}

      {/* ----- Days ----- */}
      {[...sessionsByDay.entries()].map(([day, daysSessions]) => (
        <section key={`day-${day}`} className="day-block mb-12">
          {maxDay > 1 && <DayBlock day={day} maxDay={maxDay} />}

          {daysSessions.map((session) => (
            <SessionBlock key={session.number} session={session}>
              {session.flights.map((flight) => (
                <FlightCard
                  key={flight.letter}
                  flight={flight}
                  settings={settings}
                  showDivisionColumn={showDivisionColumn}
                  hostDivision={hostDivision}
                />
              ))}
            </SessionBlock>
          ))}
        </section>
      ))}

      <footer className="mt-10 pt-4 border-t border-[var(--border-default)] text-xs text-[var(--text-subdued)] italic leading-relaxed">
        (B) bench only, (E) equipped.
        {showDivisionColumn
          ? " The Division column shows each lifter's home division."
          : ` A division code in parentheses (e.g. Wales, NW) marks a guest lifter who cannot place. Host division is ${hostDivision}.`}
        {" "}Suffixes after names: SJ sub-junior, J junior, M1–M4 masters. Open lifters have no suffix. Flight orders may change up to the entries deadline.
      </footer>
    </div>
  );
}

// =============================================================
//  Day block — chunky two-tone with a rust numeral square
// =============================================================

function DayBlock({ day, maxDay }) {
  return (
    <div className="flex items-stretch mb-6 day-header">
      <div className="w-16 h-16 bg-[var(--accent)] grid place-items-center text-[var(--text-on-accent)] flex-shrink-0">
        <span className="font-serif text-3xl font-bold leading-none">{day}</span>
      </div>
      <div className="flex-1 bg-[var(--brand)] text-[var(--text-on-dark)] flex flex-col justify-center px-4">
        <div className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[var(--text-on-dark-subdued)]">
          Day {day} of {maxDay}
        </div>
        <div className="font-serif text-lg leading-tight">Competition day</div>
      </div>
    </div>
  );
}

// =============================================================
//  Session block — left-edge rust bar + flat header
// =============================================================

function SessionBlock({ session, children }) {
  return (
    <div className="session-block mb-8">
      <div className="session-header flex items-stretch mb-4">
        <div className="w-1.5 bg-[var(--accent)]" />
        <div className="flex-1 bg-[var(--brand)] text-[var(--text-on-dark)] px-4 py-2.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[var(--text-on-dark-subdued)]">
              Session
            </span>
            <span className="font-serif text-2xl leading-none tabular-nums">
              {session.number}
            </span>
          </div>
          <span className="text-xs text-[var(--text-on-dark-subdued)] tabular-nums">
            {session.flights.length} flight{session.flights.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {children}
      </div>
    </div>
  );
}

// =============================================================
//  Flight card — rust circular badge + tabular header
// =============================================================

function FlightCard({ flight, settings, showDivisionColumn, hostDivision }) {
  const totalLifters = flight.lifters.length;
  return (
    <div className="flight-block border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
      <div className="flex items-stretch border-b border-[var(--border-default)]">
        <div className="w-12 bg-[var(--accent)] text-[var(--text-on-accent)] grid place-items-center flex-shrink-0">
          <span className="font-serif text-2xl font-bold leading-none">{flight.letter}</span>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-subdued)]">
              Flight
            </span>
            <span className="font-medium text-sm text-[var(--text-default)] tabular-nums">
              {totalLifters} lifter{totalLifters === 1 ? "" : "s"}
            </span>
          </div>
          <div className="text-xs text-[var(--text-subdued)] tabular-nums">
            {flight.fullPower} FP
            {flight.benchOnly > 0 && ` · ${flight.benchOnly} BO`}
          </div>
        </div>
      </div>

      {(flight.belowRecommended || flight.compensatoryMinutes > 0) && (
        <div className="bg-[var(--warning-bg)] border-b border-[var(--warning-border)] px-3 py-1.5 text-[11px] text-[var(--warning-text)] flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            {flight.belowRecommended && (
              <span>Below the recommended minimum of {RECOMMENDED_MIN_PER_FLIGHT} lifters per flight. </span>
            )}
            {flight.compensatoryMinutes > 0 && (
              <span>
                Add {flight.compensatoryMinutes} minute{flight.compensatoryMinutes > 1 ? "s" : ""} of compensatory time at the end of each round (IPF rule 6.2(d)).
              </span>
            )}
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[var(--text-subdued)] border-b border-[var(--border-default)]">
            <th className="text-left font-medium py-1.5 px-3">Lifter</th>
            <th className="text-left font-medium py-1.5 px-3 w-12">Age</th>
            <th className="text-left font-medium py-1.5 px-3 w-14">Class</th>
            {showDivisionColumn && <th className="text-left font-medium py-1.5 px-3 w-16">Div</th>}
            {settings.showTotal && <th className="text-right font-medium py-1.5 px-3 w-16">Total</th>}
            {settings.showGLP && <th className="text-right font-medium py-1.5 px-3 w-14">GL</th>}
          </tr>
        </thead>
        <tbody>
          {flight.lifters.map((l) => (
            <LifterRow
              key={l.id}
              lifter={l}
              settings={settings}
              showDivisionColumn={showDivisionColumn}
              hostDivision={hostDivision}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================
//  Lifter row
// =============================================================

function LifterRow({ lifter: l, settings, showDivisionColumn, hostDivision }) {
  return (
    <tr className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-subtle)]">
      <td className="py-1.5 px-3 text-[var(--text-default)]">
        <span className="inline-flex items-center gap-1.5">
          {l.openIpf ? (
            <a
              href={l.openIpf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-default)] underline decoration-[var(--accent)] decoration-1 underline-offset-[3px] hover:decoration-2 transition"
              title={`${l.firstName} ${l.lastName} on OpenIPF`}
            >
              {formatLifterName(l, { hostDivision, showDivisionColumn })}
            </a>
          ) : (
            <span>{formatLifterName(l, { hostDivision, showDivisionColumn })}</span>
          )}
          {l.instagram && (
            <a
              href={`https://instagram.com/${l.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[var(--text-disabled)] hover:text-[var(--accent)] transition no-underline ig-link"
              title={l.instagram}
              aria-label={`${l.firstName} ${l.lastName} on Instagram (${l.instagram})`}
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>
          )}
        </span>
      </td>
      <td className="py-1.5 px-3 text-[var(--text-subdued)]">{ageClassSuffix(l.ageClass)}</td>
      <td className="py-1.5 px-3 text-[var(--text-subdued)]">{classDisplay(l.weightClass)}</td>
      {showDivisionColumn && (
        <td className="py-1.5 px-3 text-[var(--text-subdued)] font-medium text-xs uppercase tracking-wider">
          {l.division || hostDivision}
        </td>
      )}
      {settings.showTotal && (
        <td className="py-1.5 px-3 text-right tabular-nums text-[var(--text-default)]">
          {l.total != null ? l.total : <span className="text-[var(--text-disabled)]">—</span>}
        </td>
      )}
      {settings.showGLP && (
        <td className="py-1.5 px-3 text-right tabular-nums text-[var(--text-default)]">
          {l.glp != null ? l.glp.toFixed(1) : <span className="text-[var(--text-disabled)]">—</span>}
        </td>
      )}
    </tr>
  );
}
