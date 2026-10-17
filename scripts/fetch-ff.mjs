// Fetches ForexFactory's public weekly calendar feed and mirrors it as CORS-readable JSON in this repo.
// Writes data/ff/latest.json (current week) and data/ff/weeks/<week-start>.json (kept forever, so past weeks build up).
// Earlier snapshots of the same week are merged so values seen once (e.g. forecast) are not lost if the feed later drops them.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const FEED = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const OUT = 'data/ff';

async function getFeed() {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(FEED, { headers: { 'user-agent': 'pulse-data-mirror (hourly, personal use)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j) || !j.length) throw new Error('empty or invalid feed');
      return j;
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 2000 * 2 ** i)); }
  }
  throw last;
}

const clean = e => ({
  title: String(e.title || '').slice(0, 200),
  country: String(e.country || '').slice(0, 8),
  date: String(e.date || ''),
  impact: String(e.impact || ''),
  forecast: String(e.forecast ?? ''),
  previous: String(e.previous ?? ''),
  ...(e.actual != null && e.actual !== '' ? { actual: String(e.actual) } : {}),
});
const key = e => `${e.country}|${e.title}|${e.date}`;

function weekStart(events) {
  const t = Math.min(...events.map(e => Date.parse(e.date)).filter(Number.isFinite));
  const d = new Date(t); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

const events = (await getFeed()).map(clean).filter(e => e.title && Number.isFinite(Date.parse(e.date)));
const week = weekStart(events);
const weekFile = `${OUT}/weeks/${week}.json`;
let prev = [];
try { prev = JSON.parse(await readFile(weekFile, 'utf8')).events || []; } catch {}
const byKey = new Map(prev.map(e => [key(e), e]));
for (const e of events) {
  const o = byKey.get(key(e)) || {};
  byKey.set(key(e), { ...o, ...Object.fromEntries(Object.entries(e).filter(([, v]) => v !== '')), ...e.title && { title: e.title } });
}
const merged = [...byKey.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
const now = new Date().toISOString();
const doc = { source: 'ForexFactory weekly calendar (nfs.faireconomy.media), mirrored hourly', fetchedAt: now, week, count: merged.length, events: merged };
await mkdir(`${OUT}/weeks`, { recursive: true });
await writeFile(weekFile, JSON.stringify(doc));
await writeFile(`${OUT}/latest.json`, JSON.stringify(doc));
// index of available weeks for the app
let idx = { weeks: [] };
try { idx = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8')); } catch {}
idx.weeks = [...new Set([...(idx.weeks || []), week])].sort();
idx.updatedAt = now;
await writeFile(`${OUT}/index.json`, JSON.stringify(idx));
console.log(`mirrored ${merged.length} events for week ${week}`);
