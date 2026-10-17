# pulse-data

Hourly mirror of ForexFactory's public weekly economic calendar feed, for the Pulse dashboard.
A GitHub Actions job (`.github/workflows/mirror.yml`) fetches the feed every hour and commits:

- `data/ff/latest.json`: the current week
- `data/ff/weeks/<YYYY-MM-DD>.json`: every week ever mirrored (week starting Sunday, UTC), so history builds up
- `data/ff/index.json`: list of available weeks

Browsers can read these files directly (GitHub sends `Access-Control-Allow-Origin: *`), e.g.
`https://raw.githubusercontent.com/<owner>/pulse-data/main/data/ff/latest.json`.

Data: ForexFactory / Fair Economy. It is intended for personal use; check their terms before showing it publicly.
Run manually: Actions tab > "Mirror ForexFactory calendar" > Run workflow.
