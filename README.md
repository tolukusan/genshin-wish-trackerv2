# Genshin Wish Projection

A Genshin Impact wish projection tool. Enter your current resources and pity, configure upcoming patches, and see exactly how many pulls you'll have by any future banner.

## Features

- **Dashboard** — overview of current primogems, fates, pity, welkin, and forecast summary at a glance
- **Patches** — manage patch timelines, Phase 1 / Phase 2 banner dates, per-patch events (with primo and fate amounts), maintenance rewards, and livestream code amounts
- **Forecast** — project your pull count to a target banner at both banner start and banner end; pulls needed auto-calculated from your current pity and 50/50 status
- **Scenarios** — chain multiple banners together; declare how many pulls you'll spend at each stop and see whether the math works out for every banner in sequence
- **Settings** — edit all projection constants (abyss rewards, Welkin, battle pass, patch cadence, default event counts, etc.)
- **Export / Import** — save and restore your full planner state as JSON

## Income Sources Modelled

| Source              | Timing                                                                       |
| ------------------- | ---------------------------------------------------------------------------- |
| Daily Commissions   | Every day                                                                    |
| Welkin Moon         | Every day (capped by days remaining)                                         |
| Spiral Abyss        | Resets on the 16th of each month                                             |
| Imaginarium Theatre | Resets on the 1st of each month                                              |
| Stygian Onslaught   | 7 days after each patch start                                                |
| Character Trials    | 40 primos per banner phase                                                   |
| Monthly Shop        | 5 fates on the 1st of each month                                             |
| Battle Pass (paid)  | 680 primos + 4 fates per completed patch cycle                               |
| Patch Maintenance   | Available from Phase 1 start (configurable per patch)                        |
| Livestream Codes    | 12 days before the next patch start (configurable per patch)                 |
| Custom Events       | Per-patch events with primo and fate amounts, assigned to Phase 1 or Phase 2 |
| Starglitter         | Converted at 5 starglitter per fate                                          |

## Stack

- **React 19** + **TypeScript**
- **Vite 8** with `@tailwindcss/vite` plugin (Tailwind v4)
- **Zustand** with `persist` middleware (localStorage)
- **Recharts** for the pull growth timeline chart
- **date-fns** for all date arithmetic

## Getting Started

```bash
cd app
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Patch Defaults

- Anchor: **v6.6**, starting **May 20, 2026**
- Patch length: **42 days**
- Phase 2 offset: **21 days** after Phase 1
- Banner duration window: **20 days**
- Default events per patch: **3** (2 in Phase 1 × 420 primos, 1 in Phase 2 × 420 primos)

All values are editable in Settings.

## Project Structure

```
app/
  src/
    engine/
      projectionEngine.ts   # all calculation logic (pure functions)
    pages/
      Dashboard.tsx
      Forecast.tsx
      Patches.tsx
      Scenarios.tsx
      Settings.tsx
    store/
      usePlannerStore.ts    # Zustand store with persist
    types/
      index.ts              # shared TypeScript types
    components/
      ui/                   # NumberInput, Toggle, StatCard, SectionHeader
      layout/               # AppShell, Sidebar
```
