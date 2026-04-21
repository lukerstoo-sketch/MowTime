# MowTime

A simple Next.js starter app that suggests the best upcoming window to mow your lawn based on recent rain, forecast rain, humidity, temperature, and wind.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Notes

- Uses Open-Meteo geocoding and forecast endpoints.
- Scoring is intentionally simple so you can tweak it easily.
- Start with city names like `Fort Wayne` for the most reliable results.
