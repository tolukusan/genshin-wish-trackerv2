# Genshin Wish Projection

A Genshin Impact pull planner. Enter what you have today, and see how many wishes you will have by a future banner, your chance of getting the character, and whether you can guarantee it. Plan several character, weapon and Chronicled banners in a row.

**Live app:** https://tolukusan.github.io/genshin-wish-trackerv2/

Future banners and patch content are not announced ahead of time, so the planner uses averages from past patches plus your own guesses. Treat results as a plan, not a promise. The in-app **Guide** explains every number and assumption.

## Using it

1. **Data Entry**: enter your primogems, fates, starglitter and pity on each banner, and turn on Welkin or Battle Pass if you have them. This is the only required step.
2. **Patches** (optional): the schedule is generated automatically. Every future patch starts as *Standard*; mark ones you expect to add a sub-area or new region, or to include Anniversary or Lantern Rite.
3. **Next Character**: pick the banner you are saving for. You get pulls at banner start and end, your chance of success, and the worst-case pulls needed.
4. **Roadmap**: add several banners in order. The planner spends what each needs, carries the rest forward, and tracks pity, 50/50 and Fate Points between them. Print or save it as a PDF.
5. **Settings**: income values and estimates are editable, plus two odds assumptions (50/50 win rate, starglitter refunds). Fixed game rules (pity, 160 primogems per fate, Battle Pass rewards) are shown but not editable. Export/Import JSON backs up your data.

Data is saved in your browser only (localStorage).

## What is counted

| Source | Timing |
| --- | --- |
| Daily Commissions | Every day |
| Welkin Moon | Every day while active (if turned on) |
| Spiral Abyss | Resets on the 16th of each month |
| Imaginarium Theater | Resets on the 1st of each month |
| Stygian Onslaught | 7 days after each patch start |
| Character Trials | 40 primogems per banner phase (2 banners × 20) |
| Monthly Shop | 5 fates on the 1st of each month |
| Battle Pass (paid) | 680 primogems + 4 fates per patch (if turned on) |
| Maintenance compensation | 600 primogems per patch |
| Livestream codes | 300 primogems, 12 days before the next patch |
| Future patch content | Per-patch estimate by type: Standard ≈68, Sub-area ≈84, New Region ≈102 wishes; Anniversary +24, Lantern Rite +20 (Roadmap) |
| Starglitter | 5 starglitter per fate; optional estimated refunds from future pulls (+10%, off by default) |

Rewards from events in the current patch are not counted, since the app cannot know which you have claimed. Patch estimates come from community F2P bookkeeping of patches 5.0 to 7.2.

## Odds model

- 5★ base rate 0.6% (weapon 0.7%), soft pity from pull 74 (weapon 63) rising about 6% (7%) per pull, hard pity 90 (80).
- Character 50/50 win rate is a setting (default 55%, reflecting Capturing Radiance). Weapon: 37.5% for the chosen weapon; Chronicled: 50%. Fate Points guarantee the next 5★; Chronicled Fate Points expire when the Chronicled Wish ends.
- "Guarantee" numbers are worst case (every 5★ at hard pity, every 50/50 lost). "Chance" is the exact probability with the pulls you will have.

## Development

```bash
pnpm install
pnpm run dev      # http://localhost:5173
pnpm run test     # Vitest
pnpm run lint
pnpm run build
```

Pushing to `main` runs lint, tests and build, then deploys to GitHub Pages.

Stack: React 19, TypeScript, Vite 8, Tailwind v4, Zustand (persisted), Recharts, date-fns, Vitest.

```
src/
  engine/       projectionEngine.ts (income + Roadmap chain), probability.ts (odds), tests
  content/      guide.ts (Guide page and "?" tooltip text)
  pages/        NextCharacter, DataEntry, Patches, Roadmap, Settings, Guide
  store/        usePlannerStore.ts (state, persistence, data migrations)
  components/   layout/ (AppShell, Sidebar, BottomNav), ui/ (InfoTip, GettingStarted, inputs)
```
