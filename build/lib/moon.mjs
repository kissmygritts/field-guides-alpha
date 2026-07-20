// Moon-phase report for a trip window — computed, never guessed. Astro planning
// with no signal needs the moon baked in: a bright moon kills the Milky Way, a
// new moon is prime. Deterministic (no external data), so it reproduces exactly.

const SYNODIC = 29.53058867;      // days
const REF_NEW_JD = 2451550.09766; // known new moon 2000-01-06 18:14 UTC

function jd(date) { // date: JS Date (UTC midnight)
  let y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
  const D = date.getUTCDate();
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5 + 0.5;
}

// Julian Day -> UTC Date (Fliegel–Van Flandern via Meeus). Used to place the
// real nearest new/full moon on the calendar, not just the window's extremes.
function jdToDate(jdv) {
  const J = jdv + 0.5, Z = Math.floor(J), F = J - Z;
  let A = Z;
  if (Z >= 2299161) { const a = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + a - Math.floor(a / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const day = Math.floor(B - D - Math.floor(30.6001 * E) + F);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return new Date(Date.UTC(year, month - 1, day));
}

function illum(date) {
  const age = ((jd(date) - REF_NEW_JD) % SYNODIC + SYNODIC) % SYNODIC;
  return { age, illum: (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2 };
}

// Real lunar event (new: phase 0; full: phase SYNODIC/2) nearest a reference JD.
function nearestPhase(refJD, phaseOffset) {
  const base = REF_NEW_JD + phaseOffset;
  const k = Math.round((refJD - base) / SYNODIC);
  return jdToDate(base + k * SYNODIC);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
// "Aug 26–29" or "Aug 30 – Sep 3"
function range(a, b) {
  if (!a) return null;
  if (a.getTime() === b.getTime()) return fmt(a);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${fmt(a)}–${b.getUTCDate()}`;
  return `${fmt(a)} – ${fmt(b)}`;
}

// startISO/endISO: 'YYYY-MM-DD'. Returns computed facts + templated cards.
export function moonReport(startISO, endISO) {
  const days = [];
  for (let t = new Date(startISO + 'T00:00:00Z'); t <= new Date(endISO + 'T00:00:00Z'); t = new Date(t.getTime() + 86400000)) {
    days.push({ date: new Date(t), ...illum(new Date(t)) });
  }
  // Coalesce contiguous days matching a predicate into [start,end] ranges.
  const spans = (pred) => {
    const out = []; let s = null, p = null;
    for (const d of days) {
      if (pred(d)) { if (!s) s = d.date; p = d.date; }
      else if (s) { out.push([s, p]); s = null; }
    }
    if (s) out.push([s, p]);
    return out;
  };
  const waning = (d) => d.age > SYNODIC / 2;
  const bright = spans((d) => d.illum >= 0.75);
  const dark = spans((d) => d.illum <= 0.30);
  const mid = spans((d) => d.illum > 0.30 && d.illum < 0.75);

  // Phase state (waxing vs waning) of a span, judged by its first day.
  const isWaning = ([s]) => waning(days.find((d) => d.date.getTime() === s.getTime()));

  const cards = [];
  if (bright[0]) {
    cards.push({ range: range(...bright[0]), text: 'full moon. Bright nights — shoot moonlit foregrounds, skip the core.' });
  }
  if (mid[0]) {
    cards.push({
      range: range(...mid[0]),
      text: isWaning(mid[0])
        ? 'waning gibbous. Moon rises late; early evening goes dark.'
        : 'waxing crescent → first quarter. Moon sets before midnight; late nights go dark.',
    });
  }
  if (dark[0]) {
    cards.push({
      dark: true,
      range: range(...dark[0]),
      text: isWaning(dark[0])
        ? 'last-quarter → new. Dark skies, prime Milky Way.'
        : 'new → thin crescent. Moon sets just after sunset — dark all night.',
    });
  }

  // Real nearest new / full moon to the middle of the window.
  const midJD = (jd(days[0].date) + jd(days[days.length - 1].date)) / 2;

  return {
    newMoon: fmt(nearestPhase(midJD, 0)),
    fullMoon: fmt(nearestPhase(midJD, SYNODIC / 2)),
    cards,
    days, // raw, for callers that want the table
  };
}
