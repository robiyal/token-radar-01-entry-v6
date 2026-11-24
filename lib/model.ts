// Token Radar, revision 6 (model radar-6, spec radar6-spec v1).
//
// One snapshot of the protocol universe in, one ranked board out. The board
// covers every slug in the snapshot's watchlist (the floor, never a ceiling)
// and every further pre-token protocol the watchlist's own exclusion rules
// leave standing: no token on record, no exchange, no versioned pool, no
// wrapped, staked or bridged product, no exchange-named product. A protocol
// is pre-token when its index entry records no token (no market cap, no
// CoinGecko id, no symbol); the snapshot's live-token protocols are kept
// apart and shown as the market's own values, never mixed into the ranked
// board.
//
// Implied value follows only from the snapshot's own figures:
//
//   M        = 10% trimmed mean of mcap / TVL over the 119 live tokens
//              (mcap recorded and not zero, TVL above zero, neither a CEX
//              nor a DOR; the one mcap of -1 kept as recorded), 11 ratios
//              trimmed from each end, 97 kept. The code computes M from the
//              sealed snapshot and refuses to score unless it equals
//              0.5707369105522613; the board is priced with that value,
//              shown as 0.571x.
//   g        = change_7d / 100 (the snapshot's seven-day change, in per cent)
//   G        = clamp(1 + 0.5 x clamp(g, -0.8, 2.0), 0.2, 2.0)
//   d        = days since first listing (unknown: 365)
//   A        = 0.75 + 0.25 x min(d / 365, 1)
//   implied  = max(1, round(min(20 x tvl_usd, tvl_usd x M x G x A)))
//
// No protocol name is ever special-cased: the same function scores every row.
// The validation the dashboard shows (the 32-variant held-out selection, the
// leave-one-out refit, the conformal range, the walk-forward split and the
// launch odds) is computed here from the same snapshot, never copied in.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  /** The fitted global multiple, full precision; the strip shows it as 0.571x. */
  base_multiple: number;
  /** The growth weight: G = 1 + growth_weight x clamped seven-day change. */
  growth_weight: number;
  /** The seven-day change, as a fraction, is clamped into this range first. */
  growth_low: number;
  growth_high: number;
  /** G itself is clamped into this range. */
  growth_mult_low: number;
  growth_mult_high: number;
  /** The maturity floor: A starts here for a protocol listed today. */
  maturity_floor: number;
  /** A rises by this much over maturity_days. */
  maturity_range: number;
  /** The days over which A rises from floor to floor + range. */
  maturity_days: number;
  /** The age in days used when a protocol records no listing date. */
  unknown_age_days: number;
  /** The cap on implied value, as a multiple of TVL. */
  value_cap: number;
}

/** The multiple the code must compute from the snapshot, or refuse to score. */
export const EXPECTED_MULTIPLE = 0.5707369105522613;
/** How far the computed multiple may sit from the expected value. */
const MULTIPLE_TOLERANCE = 1e-12;

export const MODEL: ModelConstants = {
  base_multiple: EXPECTED_MULTIPLE,
  growth_weight: 0.5,
  growth_low: -0.8,
  growth_high: 2.0,
  growth_mult_low: 0.2,
  growth_mult_high: 2.0,
  maturity_floor: 0.75,
  maturity_range: 0.25,
  maturity_days: 365,
  unknown_age_days: 365,
  value_cap: 20,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-6';
/** The build spec this entry follows, named in the entrypoint and the strip. */
export const SPEC_VERSION = 'radar6-spec v1';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 416;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A protocol set aside from the ranked board, with the reason it is set aside. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** One row of the 32-variant held-out selection. */
export interface VariantRow {
  multiple: 'median' | 'mean' | 'trimmed' | 'iqr-median';
  factors: 'bare' | 'growth' | 'maturity' | 'growth+maturity';
  cap: '20x' | 'none';
  median_abs_log_error: number;
  winner: boolean;
}

/** The validation the dashboard renders, all computed here from the snapshot. */
export interface ValidationData {
  /** The 32 held-out variants, best first. */
  variants: VariantRow[];
  /** The winning variant's median absolute log error. */
  winner_error: number;
  /** Leave-one-out, refitting the trimmed mean on the other 118 live tokens. */
  loo_median_abs_log_error: number;
  /** Leave-one-out median absolute percentage error, the median miss. */
  loo_median_abs_pct_error: number;
  /** Leave-one-out share whose actual market cap lands within twice the prediction. */
  loo_within_twofold: number;
  /** The 90% conformal quantile of the leave-one-out log residuals. */
  conformal_q90_log: number;
  /** The conformal factor: a row's 90% range is implied / factor to implied x factor. */
  conformal_factor: number;
  /** The conformal range's coverage on the live tokens themselves. */
  conformal_coverage: number;
  /** Walk-forward: fit on the earlier-listed half, test on the later half. */
  walk_forward_median_abs_log_error: number;
  walk_forward_train: number;
  walk_forward_test: number;
  /** The ablation: the four factor sets under the trimmed mean, cap 20x. */
  ablation: { factors: VariantRow['factors']; median_abs_log_error: number }[];
  /** Launch odds by category: live tokens over all protocols in the category. */
  launch_odds: { category: string; live: number; total: number; odds_pct: number }[];
  /** The fitted multiple's own figures, for the strip. */
  fit: { population: number; trimmed: number; dropped_each_end: number; multiple: number };
}

/** Everything the dashboard needs: the board, the live set, the set-aside and the validation. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  spec_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  set_aside_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  set_aside: SetAsideRow[];
  validation: ValidationData;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The seven-day growth multiplier: 1 plus half the clamped fractional change. */
export function growthMultiplier(protocol: SnapshotProtocol, model: ModelConstants): { growthPct: number; growthMult: number } {
  const raw = finite(protocol.change_7d, 0);
  const growthPct = raw;
  const g = Math.min(model.growth_high, Math.max(model.growth_low, raw / 100));
  const growthMult = Math.min(model.growth_mult_high, Math.max(model.growth_mult_low, 1 + model.growth_weight * g));
  return { growthPct, growthMult };
}

/** The tokenless-age multiplier: from the floor for a new protocol to 1.0 at a year. */
export function maturityMultiplier(age: number | null, model: ModelConstants): number {
  const d = age ?? model.unknown_age_days;
  return model.maturity_floor + model.maturity_range * Math.min(Math.max(d, 0) / model.maturity_days, 1);
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { growthPct, growthMult } = growthMultiplier(protocol, model);
  const maturityMult = maturityMultiplier(age, model);
  const uncapped = protocol.tvl_usd * model.base_multiple * growthMult * maturityMult;
  const implied = Math.max(1, Math.round(Math.min(model.value_cap * protocol.tvl_usd, uncapped)));
  return { implied, growthPct, growthMult, maturityMult, age };
}

/** The live-token population the multiple is fitted on: a recorded market cap that is not zero, a TVL
 * above zero, neither an exchange nor a DOR. The one market cap of -1 stays in, as recorded. */
export function fitPopulation(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd !== 0 && p.tvl_usd > 0 && p.category !== 'CEX' && p.category !== 'DOR',
  );
}

/** The 10% trimmed mean of a sorted list of ratios: 10% trimmed from each end, the mean of the rest. */
export function trimmedMean(sortedRatios: number[]): { mean: number; kept: number; dropped: number } {
  const n = sortedRatios.length;
  const dropped = Math.floor(n * 0.1);
  const kept = sortedRatios.slice(dropped, n - dropped);
  return { mean: kept.reduce((s, r) => s + r, 0) / kept.length, kept: kept.length, dropped };
}

/** The global multiple, computed from the sealed snapshot and checked against the spec's value. */
export function fitMultiple(snapshot: Snapshot): { multiple: number; population: number; kept: number; dropped: number } {
  const pop = fitPopulation(snapshot);
  const ratios = pop.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
  const { mean, kept, dropped } = trimmedMean(ratios);
  if (Math.abs(mean - EXPECTED_MULTIPLE) > MULTIPLE_TOLERANCE) {
    throw new SnapshotError(
      `the snapshot's trimmed mean is ${mean}, not the spec's ${EXPECTED_MULTIPLE}: refusing to score with a different multiple`,
    );
  }
  return { multiple: EXPECTED_MULTIPLE, population: pop.length, kept, dropped };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** The categories the watchlist leaves out as wrapped, staked or bridged products. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** A whole word wrapped, staked or staking in a name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** The exchanges whose name at the start of a protocol's name leaves it out. */
const EXCHANGES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, and clear of every watchlist exclusion
 * but the floor and the parent rule. A curator of a protocol that already trades is still a protocol
 * waiting on a launch of its own, so a recorded parent does not exclude it here. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGES.some((e) => p.name.startsWith(e))
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every further protocol the watchlist's exclusion rules leave standing, by TVL.
  // No floor, no cap: the rules leave exactly 158 of them, so the board holds 40 + 158 rows.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const { implied, growthPct, growthMult, maturityMult, age } = impliedValue(p, snapshot.as_of, model);
    return { p, implied, growthPct, growthMult, maturityMult, age };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** The live-token protocols, by market cap: every one of them, set aside from the ranking. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** Why one pre-token protocol is set aside from the ranked board. */
export function setAsideReason(p: SnapshotProtocol): string {
  if (p.category === 'CEX') return 'An exchange: its token, if it issues one, is the exchange\u2019s own, not a protocol launch.';
  if (VERSIONED.test(p.name)) return 'A versioned pool: its name ends in a version marker, so it is a pool of another protocol.';
  if (WRAPPED_CATEGORIES.has(p.category ?? '')) return 'A wrapped, staked or bridged product of a token that already trades.';
  if (WRAPPED_WORD.test(p.name)) return 'Named as a wrapped or staked product of a token that already trades.';
  if (EXCHANGES.some((e) => p.name.startsWith(e))) return 'Named for an exchange, not for a protocol of its own.';
  return 'Left out of the watchlist: DefiLlama records a parent protocol for it, so it is a product of another protocol.';
}

/** Every pre-token protocol the board does not rank, with the reason it is set aside. */
export function setAsideRows(snapshot: Snapshot, board: BoardRow[]): SetAsideRow[] {
  const onBoard = new Set(board.map((r) => r.slug));
  return snapshot.protocols
    .filter((p) => isPreToken(p) && !onBoard.has(p.slug))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: setAsideReason(p),
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** The median of a list of numbers; the mean of the two middle values when the count is even. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return s[(n - 1) / 2]!;
  return (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

/** The four multiples of a list of ratios: median, mean, 10% trimmed mean, IQR median. */
function multiplesOf(ratios: number[]): Record<VariantRow['multiple'], number> {
  const s = [...ratios].sort((a, b) => a - b);
  const n = s.length;
  const k = Math.floor(n * 0.1);
  const trimmed = s.slice(k, n - k);
  const q1 = s[Math.floor(n / 4)]!;
  const q3 = s[Math.floor((3 * n) / 4)]!;
  const inIqr = s.filter((r) => r >= q1 && r <= q3);
  return {
    median: median(s),
    mean: s.reduce((a, b) => a + b, 0) / n,
    trimmed: trimmed.reduce((a, b) => a + b, 0) / trimmed.length,
    'iqr-median': median(inIqr),
  };
}

const FACTOR_SETS: VariantRow['factors'][] = ['bare', 'growth', 'maturity', 'growth+maturity'];
const MULTIPLE_NAMES: VariantRow['multiple'][] = ['median', 'mean', 'trimmed', 'iqr-median'];

/** The factor adjustment of one protocol under one factor set: 1 unless the set names the factor. */
function factorOf(p: SnapshotProtocol, asOf: string, factors: VariantRow['factors'], model: ModelConstants): number {
  let f = 1;
  if (factors.includes('growth')) f *= growthMultiplier(p, model).growthMult;
  if (factors.includes('maturity')) f *= maturityMultiplier(ageDays(asOf, p.listed_at), model);
  return f;
}

/** The 32-variant held-out selection: even slugs train, odd slugs test, by slug order. */
function variantTable(snapshot: Snapshot, model: ModelConstants): VariantRow[] {
  const pop = fitPopulation(snapshot).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const train = pop.filter((_, i) => i % 2 === 0);
  const test = pop.filter((_, i) => i % 2 === 1 && _.mcap_usd !== null && _.mcap_usd > 0);
  const rows: VariantRow[] = [];
  for (const factors of FACTOR_SETS) {
    // Each variant fits its multiple on the train set's factor-adjusted ratios: the multiple is the
    // price of one unit of factor-adjusted TVL, so the fit and the prediction use the same base.
    const fitted = multiplesOf(train.map((p) => p.mcap_usd! / (p.tvl_usd * factorOf(p, snapshot.as_of, factors, model))));
    for (const multiple of MULTIPLE_NAMES) {
      const m = fitted[multiple]!;
      for (const cap of ['20x', 'none'] as const) {
        const errors = test.map((p) => {
          const imp = p.tvl_usd * m * factorOf(p, snapshot.as_of, factors, model);
          const capped = cap === '20x' ? Math.min(imp, 20 * p.tvl_usd) : imp;
          return Math.abs(Math.log(capped / p.mcap_usd!));
        });
        rows.push({ multiple, factors, cap, median_abs_log_error: median(errors), winner: false });
      }
    }
  }
  let best = rows[0]!;
  for (const r of rows) if (r.median_abs_log_error < best.median_abs_log_error) best = r;
  best.winner = true;
  rows.sort((a, b) => a.median_abs_log_error - b.median_abs_log_error || (a.multiple < b.multiple ? -1 : 1));
  return rows;
}

/** Leave-one-out: refit the trimmed mean on the other live tokens and predict the held-out one. */
function leaveOneOut(snapshot: Snapshot, model: ModelConstants): {
  medianAbsLogError: number;
  medianAbsPctError: number;
  withinTwofold: number;
  q90Log: number;
  factor: number;
  coverage: number;
} {
  const pop = fitPopulation(snapshot);
  const residuals: number[] = [];
  const pctErrors: number[] = [];
  for (let i = 0; i < pop.length; i++) {
    const p = pop[i]!;
    if (p.mcap_usd === null || p.mcap_usd <= 0) continue;
    const others = pop.filter((_, j) => j !== i);
    const { mean } = trimmedMean(others.map((q) => q.mcap_usd! / q.tvl_usd).sort((a, b) => a - b));
    const { growthMult } = growthMultiplier(p, model);
    const maturityMult = maturityMultiplier(ageDays(snapshot.as_of, p.listed_at), model);
    const imp = Math.min(model.value_cap * p.tvl_usd, p.tvl_usd * mean * growthMult * maturityMult);
    residuals.push(Math.abs(Math.log(imp / p.mcap_usd)));
    pctErrors.push(Math.abs(imp - p.mcap_usd) / p.mcap_usd);
  }
  const sorted = [...residuals].sort((a, b) => a - b);
  const q90 = sorted[Math.ceil(0.9 * sorted.length) - 1]!;
  return {
    medianAbsLogError: median(residuals),
    medianAbsPctError: median(pctErrors),
    withinTwofold: residuals.filter((r) => r <= Math.log(2)).length / residuals.length,
    q90Log: q90,
    factor: Math.exp(q90),
    coverage: residuals.filter((r) => r <= q90).length / residuals.length,
  };
}

/** Walk-forward: fit on the earlier-listed half of the dated live tokens, test on the later half. */
function walkForward(snapshot: Snapshot, model: ModelConstants): { error: number; train: number; test: number } {
  const dated = fitPopulation(snapshot)
    .filter((p) => p.listed_at !== null && p.mcap_usd !== null && p.mcap_usd > 0)
    .sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : a.listed_at! > b.listed_at! ? 1 : a.slug < b.slug ? -1 : 1));
  const half = Math.floor(dated.length / 2);
  const train = dated.slice(0, half);
  const test = dated.slice(half);
  const { mean } = trimmedMean(
    train.map((p) => p.mcap_usd! / (p.tvl_usd * factorOf(p, snapshot.as_of, 'growth+maturity', model))).sort((a, b) => a - b),
  );
  const errors = test.map((p) => {
    const imp = Math.min(model.value_cap * p.tvl_usd, p.tvl_usd * mean * factorOf(p, snapshot.as_of, 'growth+maturity', model));
    return Math.abs(Math.log(imp / p.mcap_usd!));
  });
  return { error: median(errors), train: train.length, test: test.length };
}

/** Launch odds by category: the share of a category's protocols that record a token. */
function launchOdds(snapshot: Snapshot): ValidationData['launch_odds'] {
  const totals = new Map<string, number>();
  const live = new Map<string, number>();
  for (const p of snapshot.protocols) {
    const c = p.category ?? 'Uncategorised';
    totals.set(c, (totals.get(c) ?? 0) + 1);
    if (!isPreToken(p)) live.set(c, (live.get(c) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([category, total]) => {
      const l = live.get(category) ?? 0;
      return { category, live: l, total, odds_pct: Math.round((l / total) * 1000) / 10 };
    })
    .sort((a, b) => b.total - a.total || (a.category < b.category ? -1 : 1));
}

/** The whole validation, computed from the snapshot. */
export function buildValidation(snapshot: Snapshot, model: ModelConstants): ValidationData {
  const fit = fitMultiple(snapshot);
  const variants = variantTable(snapshot, model);
  const winner = variants.find((v) => v.winner)!;
  const loo = leaveOneOut(snapshot, model);
  const wf = walkForward(snapshot, model);
  const ablation = FACTOR_SETS.map((factors) => ({
    factors,
    median_abs_log_error: variants.find((v) => v.multiple === 'trimmed' && v.factors === factors && v.cap === '20x')!.median_abs_log_error,
  }));
  return {
    variants,
    winner_error: winner.median_abs_log_error,
    loo_median_abs_log_error: loo.medianAbsLogError,
    loo_median_abs_pct_error: loo.medianAbsPctError,
    loo_within_twofold: loo.withinTwofold,
    conformal_q90_log: loo.q90Log,
    conformal_factor: loo.factor,
    conformal_coverage: loo.coverage,
    walk_forward_median_abs_log_error: wf.error,
    walk_forward_train: wf.train,
    walk_forward_test: wf.test,
    ablation,
    launch_odds: launchOdds(snapshot),
    fit: { population: fit.population, trimmed: fit.kept, dropped_each_end: fit.dropped, multiple: fit.multiple },
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const fit = fitMultiple(snapshot);
  void fit;
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const setAside = setAsideRows(snapshot, board);
  const validation = buildValidation(snapshot, model);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    spec_version: SPEC_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.length - snapshot.watchlist.length,
    live_size: live.length,
    set_aside_size: setAside.length,
    rows: board.map(radarRow),
    live,
    set_aside: setAside,
    validation,
  };
  return { board, radar };
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
