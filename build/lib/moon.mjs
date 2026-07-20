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

function illum(date) {
  const age = ((jd(date) - REF_NEW_JD) % SYNODIC + SYNODIC) % SYNODIC;
  return { age, illum: (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2 };
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
  const transition = spans((d) => waning(d) && d.illum > 0.30 && d.illum < 0.75);

  // Nearest new / full moon dates (min/max illum days).
  const extreme = (cmp) => days.reduce((a, b) => (cmp(b.illum, a.illum) ? b : a)).date;
  const newMoon = extreme((x, y) => x < y);
  const fullMoon = extreme((x, y) => x > y);

  const cards = [];
  if (bright[0]) cards.push({ range: range(...bright[0]), text: 'full moon. Bright nights — shoot moonlit foregrounds; skip the core.' });
  if (transition[0]) cards.push({ range: range(...transition[0]), text: 'waning gibbous. Moon rises late; early evening goes dark.' });
  if (dark[0]) cards.push({ dark: true, range: range(...dark[0]), text: 'last-quarter → new. Dark skies, prime Milky Way.' });

  return {
    newMoon: fmt(newMoon),
    fullMoon: fmt(fullMoon),
    cards,
    days, // raw, for callers that want the table
  };
}
