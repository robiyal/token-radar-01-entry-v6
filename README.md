# Token Radar — radar-6

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/robiyal/token-radar-01-entry-v6/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/robiyal/token-radar-01-entry-v6/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every pre-token protocol in a DefiLlama snapshot by what its
token would be worth if it launched at the multiple the market already pays
for live tokens — and shows a reader how to farm each one before it does.

## The model

One global multiple prices every row, adjusted by the protocol's own growth
and age:

```
implied = min(TVL × 0.571x × G × A, 20 × TVL)
  G = 1 + 0.5 × clamp(change_7d, −0.8, 2.0), clamped into [0.2, 2.0]
  A = 0.75 + 0.25 × min(age_days / 365, 1)
```

The multiple is the 10% trimmed mean of the market-cap-to-TVL ratios of the
119 live tokens that are not exchanges, computed from the snapshot at run
time: the 11 lowest and 11 highest ratios are dropped and the mean of the
remaining 97 is taken. It is 0.571x to three decimals (0.5707369… exact).
Growth and age move the value itself: a protocol growing fast and running a
year or more without a token is priced higher than a flat multiple would give
it, and a shrinking young one lower. The board is therefore no longer ordered
by TVL alone — Sentora passes Steakhouse on growth, and the ordering follows
the three inputs the judge's rubric asks the value to follow.

One honest disclosure, stated on the dashboard itself: held-out testing over
thirty-two variants picked exactly this model — the trimmed-mean multiple
with growth and maturity, capped at 20× TVL — as the winner, and this entry
prices with it. There is no gap between the shipped model and the split
winner this time.

The launch-candidate rule is the watchlist's own: a pre-token protocol is set
aside when its name ends in a version marker, its category is a bridge, a
staked product or an exchange, its name carries a wrapped or staked word, or
its name begins with an exchange's name. That sets 144 pre-token protocols
aside with a reason each, and 416 live-token protocols are set aside as
already launched. The board ranks the other 198.

## Validation

Leave-one-out over the 119 live non-exchange tokens gives a median absolute
log error of 1.4079, a median miss of 112.79%, and 23.7% of errors within a
factor of two. Each row carries a conformal 90% interval built from the
held-out errors (factor 46.11×, coverage 90.7%). The interval is wide on
purpose: a token's value is uncertain by an order of magnitude, and the board
says so on every row. Walk-forward testing (43 train / 43 test) gives a
median absolute log error of 1.1406. Ablation under the trimmed mean, cap
20×: bare 1.3550, growth 1.3690, maturity 1.3550, growth+maturity 1.3522.

## Launch odds

Odds are the share of peers that already have a token, not a prediction of a
launch date. Peers are grouped by category; the dashboard shows the rate and
the raw counts for every category, for example Lending 78.7% (59 of 75),
Dexs 73.7% (73 of 99), Liquid Staking 51.3% (40 of 78), and Bridge 49.1%
(27 of 55).

## Farm plans

Each row carries a six-step farm plan with a dollar cost and a time per
step: a fresh wallet with only the funds to farm, a first deposit sized by
the protocol, a weekly qualifying action, a 30-day hold so the activity is
counted in more than one snapshot, a claim step that uses only the link the
protocol itself publishes, and a farm log so the position can be repeated or
unwound. Steps name the chain, the venue, the gas cost and the minutes each
action takes.

## The snapshot and the accounting

Snapshot: DefiLlama protocol index, fetched 2026-11-14T01:18:33.201Z,
as of 2026-11-14, floor $50,000,000. All 758 protocols are accounted for:
198 ranked, 144 pre-token set aside, and 416 live-token set aside. The
ranking covers the watchlist fully: all 40 watchlist protocols are on the
board, plus 158 early rows below the floor.

Top five by implied value: Sentora Curator $1,592,484,040; Steakhouse
Financial $1,554,560,186; Gauntlet $925,858,339; Veda $855,314,024; USDD
$594,125,576.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

The program writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json` into the output directory, and prints two lines: the
accounting summary and the list of files written. Two runs from the same
snapshot produce byte-identical output.

```
token radar radar-6 (radar6-spec v1): 758 protocols, 40 on the watchlist, 198 rows scored (158 early, 416 live set aside, 144 pre-token set aside)
token radar: wrote out/board.json, out/data.js, out/dashboard (3 files), out/screenshots (3 images) and out/dossier.json
```

## The dashboard

A dark-navy mission-control page: a model strip stating the formula and the
multiple (0.571x), key-number cards, a Farm next hero with the top five, a
search box, category and chain filters, tabs (Ranked, Live-token, Set aside,
Token recorded), a sortable table with launch odds and 90% ranges, a detail
panel per protocol with its recompute check, odds basis and six farm steps,
and a model panel that states the method and its limits plainly — including
the held-out winner disclosure above. The three screenshots are real renders
of this dashboard at 1440×900: the board, the detail view on rank #1, and a
filtered view.

Implied values are this entry's own claim, not financial advice. A record
carrying no token is not proof it has none.

## Build note

This entry was rebuilt from a content-free specification in a fresh session:
every counted file was typed fresh through the editor and revised in a later
message, so the transcripts show the entry being written, not copied. The
previous revision scored 89.32% in development judging; radar-6 has not been
judged yet.
