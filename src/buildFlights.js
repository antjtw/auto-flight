// =============================================================
//  Flight building algorithm
//
//  Given a list of lifters and a set of options, return:
//    { sessions, error, requiredFlightCount, totalSessions, days }
//
//  Sessions are an array of { number, day, flights }. Each flight is
//  { letter, lifters, fullPower, benchOnly, belowRecommended,
//    compensatoryMinutes }.
// =============================================================

import { weightClassOrder } from "./constants.js";
import {
  RECOMMENDED_MIN_PER_FLIGHT,
  compensatoryMinutes,
  seededShuffle,
} from "./utils.js";

// Pack a list of lifters into flights, honouring the per-flight cap.
//   maxPerFlight: 14 for full-power, 20 for bench-only or mixed
//   evenly: if true and the list spans multiple flights, distribute lifters
//     as evenly as possible across them. So 22 lifters with maxPerFlight=14
//     becomes 11+11 instead of 14+8.
export function packLifters(list, maxPerFlight, evenly) {
  if (list.length === 0) return [];
  if (list.length <= maxPerFlight) return [list];
  const flightCount = Math.ceil(list.length / maxPerFlight);
  if (!evenly) {
    const result = [];
    for (let i = 0; i < list.length; i += maxPerFlight) {
      result.push(list.slice(i, i + maxPerFlight));
    }
    return result;
  }
  // Even distribution. Compute base size + remainder; earlier flights get
  // one extra lifter each until the remainder is used up.
  const base = Math.floor(list.length / flightCount);
  const remainder = list.length % flightCount;
  const result = [];
  let cursor = 0;
  for (let i = 0; i < flightCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    result.push(list.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}

// Build flights for one stream of lifters (the whole entry list, one sex,
// or one weight class — depending on the separation settings).
// Full-power and bench-only pack together where allowed.
export function buildStream(lifters, opts) {
  const { splitByType, evenly } = opts;
  const fp = lifters.filter((l) => l.compType === "FULL");
  const bo = lifters.filter((l) => l.compType === "BENCH");
  const flights = [];
  if (splitByType) {
    flights.push(...packLifters(fp, 14, evenly));
    flights.push(...packLifters(bo, 20, evenly));
  } else {
    // Pack FP first, then fold BO into each flight up to 20 total.
    // Any leftover BO becomes its own flights.
    const fpFlights = packLifters(fp, 14, evenly);
    let boIdx = 0;
    for (const flightFP of fpFlights) {
      const capacityForBO = 20 - flightFP.length;
      const flightBO = bo.slice(boIdx, Math.min(boIdx + capacityForBO, bo.length));
      boIdx += flightBO.length;
      flights.push([...flightFP, ...flightBO]);
    }
    if (boIdx < bo.length) {
      flights.push(...packLifters(bo.slice(boIdx), 20, evenly));
    }
  }
  return flights;
}

export function buildFlights(lifters, opts) {
  const sortBy = opts.sortBy;
  const splitByType = opts.splitByType ?? false;
  const balanceEvenly = opts.balanceEvenly ?? true;
  const separateSexes = opts.separateSexes ?? false;
  const separateClasses = opts.separateClasses ?? false;
  const flightOrder = opts.flightOrder ?? "women-first";
  const days = Math.max(1, opts.days ?? 1);
  const flightsPerSession = Math.max(1, opts.flightsPerSession ?? 2);
  const targetSessionsPerDay = opts.targetSessionsPerDay ?? null;

  const classOrder = weightClassOrder(flightOrder);

  // Group by class, sort within class.
  const byClass = new Map();
  for (const cls of classOrder) byClass.set(cls, []);
  for (const l of lifters) {
    if (!byClass.has(l.weightClass)) byClass.set(l.weightClass, []);
    byClass.get(l.weightClass).push(l);
  }

  // Order each class internally: heaviest metric first, no-metric lifters
  // randomised at the bottom of their class (stable but deterministic).
  let seed = 1;
  function orderClass(group) {
    const withMetric = group.filter((l) => l[sortBy] != null);
    const withoutMetric = group.filter((l) => l[sortBy] == null);
    withMetric.sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
    const shuffled = seededShuffle(withoutMetric, seed++);
    return [...withMetric, ...shuffled];
  }

  // Build the streams that will become flights. A "stream" is a sequence
  // whose lifters may share flights.
  const streams = [];

  if (separateClasses) {
    for (const cls of classOrder) {
      const group = byClass.get(cls) ?? [];
      if (group.length === 0) continue;
      streams.push({ label: cls, lifters: orderClass(group) });
    }
    // Defensive: pick up any non-canonical classes we may have missed.
    for (const [cls, group] of byClass.entries()) {
      if (classOrder.includes(cls)) continue;
      if (group.length === 0) continue;
      streams.push({ label: cls, lifters: orderClass(group) });
    }
  } else if (separateSexes) {
    // Sexes can't mix in a flight. Run same-sex classes in sequence as one
    // stream; start a new stream when the sex changes. In women-first /
    // men-first this gives one big stream per sex; in ascending mode it
    // gives many short streams as sexes alternate.
    let current = null;
    let currentLabel = null;
    for (const cls of classOrder) {
      const group = byClass.get(cls) ?? [];
      if (group.length === 0) continue;
      const sex = cls.startsWith("F") ? "Women" : "Men";
      if (sex !== currentLabel) {
        if (current && current.length) streams.push({ label: currentLabel, lifters: current });
        current = [];
        currentLabel = sex;
      }
      current.push(...orderClass(group));
    }
    if (current && current.length) streams.push({ label: currentLabel, lifters: current });
  } else {
    // Single combined stream. In women-first this gives the familiar
    // F47…F84+, M53…M120+. In ascending mode classes interleave by weight.
    const all = [];
    for (const cls of classOrder) {
      const group = byClass.get(cls) ?? [];
      if (group.length === 0) continue;
      all.push(...orderClass(group));
    }
    for (const [cls, group] of byClass.entries()) {
      if (classOrder.includes(cls)) continue;
      all.push(...group);
    }
    if (all.length) streams.push({ label: "All", lifters: all });
  }

  // Pack each stream into flights.
  const allFlights = [];
  for (const stream of streams) {
    const streamFlights = buildStream(stream.lifters, { splitByType, evenly: balanceEvenly });
    for (const f of streamFlights) allFlights.push(f);
  }

  // Decorate each flight with metadata.
  const decorated = allFlights.map((lifters) => {
    const benchOnly = lifters.filter((l) => l.compType === "BENCH").length;
    const fullPower = lifters.length - benchOnly;
    return {
      lifters,
      fullPower,
      benchOnly,
      belowRecommended: lifters.length > 0 && lifters.length < RECOMMENDED_MIN_PER_FLIGHT,
      compensatoryMinutes: compensatoryMinutes(lifters.length),
    };
  });

  // Group flights into sessions, then sessions into days.
  // Auto mode: total sessions = ceil(flights / flightsPerSession), distributed
  // across days. Earlier days take extras when sessions don't divide evenly.
  // Manual mode: a fixed sessionsPerDay applied to every day; error if total
  // capacity (days × sessionsPerDay × flightsPerSession) is less than required.
  const requiredFlightCount = decorated.length;
  let error = null;
  let totalSessions;
  let sessionsPerDay;

  if (targetSessionsPerDay != null) {
    sessionsPerDay = Array(days).fill(targetSessionsPerDay);
    totalSessions = days * targetSessionsPerDay;
    const capacity = totalSessions * flightsPerSession;
    if (capacity < requiredFlightCount) {
      const suggestedSessionsPerDay = Math.ceil(requiredFlightCount / (days * flightsPerSession));
      const suggestedDays = Math.ceil(requiredFlightCount / (targetSessionsPerDay * flightsPerSession));
      error = {
        message:
          `Your entries need ${requiredFlightCount} flight${requiredFlightCount === 1 ? "" : "s"} but you set ${capacity} ` +
          `(${days} day${days === 1 ? "" : "s"} × ${targetSessionsPerDay} session${targetSessionsPerDay === 1 ? "" : "s"} × ${flightsPerSession} flight${flightsPerSession === 1 ? "" : "s"}). ` +
          `Try ${suggestedSessionsPerDay} sessions per day, or ${suggestedDays} days, or relax the separation settings.`,
        requiredFlightCount,
        capacity,
      };
    }
  } else {
    totalSessions = Math.max(1, Math.ceil(requiredFlightCount / flightsPerSession));
    const baseSessions = Math.floor(totalSessions / days);
    const remainder = totalSessions % days;
    sessionsPerDay = Array.from({ length: days }, (_, i) => baseSessions + (i < remainder ? 1 : 0));
  }

  // Assign flights → sessions → days.
  const sessions = [];
  let flightIdx = 0;
  let sessionNum = 0;
  for (let d = 0; d < days; d++) {
    const sessionsThisDay = sessionsPerDay[d];
    for (let s = 0; s < sessionsThisDay; s++) {
      sessionNum++;
      const sessionFlights = [];
      for (let f = 0; f < flightsPerSession; f++) {
        if (flightIdx >= decorated.length) break;
        sessionFlights.push({
          letter: String.fromCharCode(65 + flightIdx),
          ...decorated[flightIdx],
        });
        flightIdx++;
      }
      sessions.push({
        number: sessionNum,
        day: d + 1,
        flights: sessionFlights,
      });
    }
  }

  // If configured capacity was smaller than required, push the overflow
  // flights into the final session — they still appear, and the error message
  // above explains the situation.
  while (flightIdx < decorated.length) {
    if (sessions.length === 0) {
      sessions.push({ number: 1, day: 1, flights: [] });
    }
    sessions[sessions.length - 1].flights.push({
      letter: String.fromCharCode(65 + flightIdx),
      ...decorated[flightIdx],
    });
    flightIdx++;
  }

  return { sessions, error, requiredFlightCount, totalSessions, days };
}
