// Single source of truth for help text. The Guide page renders every topic in
// full; InfoTip ("?") buttons show a topic's summary and link to its section.
// Keep summaries to one or two sentences.

export type GuideTopicId =
  | 'getting-started'
  | 'how-projections-work'
  | 'future-is-speculation'
  | 'patch-types'
  | 'banner-labels'
  | 'pity'
  | 'fifty-fifty'
  | 'fate-points'
  | 'guarantee-vs-chance'
  | 'roadmap'
  | 'starglitter'
  | 'your-data'

export interface GuideTopic {
  id: GuideTopicId
  title: string
  summary: string
  body: string[] // paragraphs; lines starting with "• " render as a bullet list
}

export const GUIDE: GuideTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'Enter what you have today on Data Entry, check the patch schedule, then read your projection.',
    body: [
      '• Data Entry: enter your primogems, Intertwined Fates, starglitter and pity for each banner. Turn on Welkin or Battle Pass if you have them. This is the only step you must do.',
      '• Patches: the schedule is generated automatically. Optionally mark patches you expect to add a sub-area or new region, or to include Anniversary or Lantern Rite.',
      '• Next Character: pick the banner you are saving for to see how many pulls you will have and your chance of getting the character.',
      '• Roadmap: plan several banners in a row (characters, weapons, Chronicled Wishes). Pulls you do not spend carry forward.',
      'Everything is saved in your browser automatically. Update Data Entry whenever your resources change.',
    ],
  },
  {
    id: 'how-projections-work',
    title: 'How projections are counted',
    summary: 'Your current resources plus predictable future income: commissions, endgame modes, the shop, Welkin/Battle Pass if active, and an estimate per future patch.',
    body: [
      'A projection starts from what you entered on Data Entry and adds income you can reasonably expect before the banner: daily commissions, Spiral Abyss, Imaginarium Theater, Stygian Onslaught, the monthly shop, character trials, maintenance compensation and livestream codes.',
      'Welkin Moon and the Battle Pass are only counted if you turned them on in Data Entry.',
      'Rewards from events in the patch that is running now are not counted, because the app cannot know which ones you already claimed. Future patches use an estimate based on their patch type (see "Patch types").',
      'Every number in Settings can be changed if your own experience differs.',
    ],
  },
  {
    id: 'future-is-speculation',
    title: 'Future patches are speculation',
    summary: 'Nobody knows future banners or patch content in advance. The app uses averages and your own guesses; treat results as a plan, not a promise.',
    body: [
      'HoYoverse only announces a patch shortly before it releases, so this app cannot know future featured characters, events, or whether a patch adds a new area.',
      'Instead it uses averages from past patches and lets you make your own guesses. Different players will reasonably speculate differently, and that is expected.',
      'When a patch is officially announced, update its type on the Patches page (and optionally label its banners in Settings → Featured Characters) to sharpen the projection.',
    ],
  },
  {
    id: 'patch-types',
    title: 'Patch types',
    summary: 'Standard, Sub-area or New Region sets how many wishes a future patch is expected to give. Anniversary and Lantern Rite add a bonus. They are guesses until a patch is announced.',
    body: [
      'Each future patch contributes an estimate of all the wishes it gives (events, exploration, quests, mail). The estimate depends on what you expect the patch to contain:',
      '• Standard: no new map area. Recent standard patches gave about 68 free wishes.',
      '• Sub-area: a new area added to an existing region. Recent ones averaged about 84.',
      '• New Region: a whole new nation or region (usually x.0 patches). About 102 or more.',
      '• Anniversary (+about 22) and Lantern Rite (+about 20 to 26) stack on top of the base type.',
      'Every patch starts as Standard because the content is not known ahead of time. If you expect a patch to add an area, change it on the Patches page. The averages come from community F2P bookkeeping of patches 5.0 to 7.2 and can be edited in Settings.',
    ],
  },
  {
    id: 'banner-labels',
    title: 'Banner names',
    summary: 'Banners are identified by version and phase (for example "v7.3 Phase 1") because future featured characters are unknown. You can add names once they are announced.',
    body: [
      'Future featured characters are not known, so banners are listed by version and phase, for example "v7.3 Phase 1 · Dec 16".',
      'Once a banner is announced you can add the character names in Settings → Featured Characters. They then appear in the banner pickers. This is optional and does not change any numbers.',
    ],
  },
  {
    id: 'pity',
    title: 'Pity',
    summary: 'Pity is how many pulls you have made since your last 5★ on that banner. Character and Chronicled banners guarantee a 5★ by pull 90, the weapon banner by 80.',
    body: [
      'Pity counts your pulls since the last 5★ on a banner. You can see it in-game in your wish history, or with a wish tracker.',
      'The 5★ rate is 0.6% per pull (0.7% on the weapon banner) until "soft pity" around pull 74 (63 for weapons), after which it climbs quickly. A 5★ is guaranteed at "hard pity": pull 90 (80 for weapons).',
      'Character, weapon and Chronicled banners each have their own pity, and pity carries over to the next banner of the same kind.',
      'These are fixed game rules, so they are shown in Settings → Game Rules but cannot be edited. Changing them would make every worst-case number wrong.',
    ],
  },
  {
    id: 'fifty-fifty',
    title: 'The 50/50 and guarantees',
    summary: 'On the character banner your 5★ is the featured character or a standard one. If you lose, the next 5★ is guaranteed to be featured.',
    body: [
      'When you get a 5★ on the character banner it is either the featured character (you "win the 50/50") or a standard character (you "lose"). After a loss, your next 5★ is guaranteed to be the featured character. Turn on "Guaranteed" in Data Entry if you lost your last 50/50.',
      'Since version 5.0, Capturing Radiance makes losing slightly less likely, so in practice players win around 55 to 59% of the time. The "50/50 Win Rate" setting (default 55%) only affects the chance-of-success figures; worst-case numbers always assume you lose.',
    ],
  },
  {
    id: 'fate-points',
    title: 'Fate Points (weapon and Chronicled)',
    summary: 'On the weapon and Chronicled banners, getting the wrong 5★ earns a Fate Point, which guarantees your chosen item next time. Chronicled Fate Points expire when that Chronicled Wish ends.',
    body: [
      'On the weapon banner you choose one of the two featured weapons with Epitomized Path. If a 5★ is not your chosen weapon you earn a Fate Point, and with 1 Fate Point your next 5★ is the chosen weapon.',
      'Chronicled Wishes work the same way with a chosen character or weapon, except Fate Points expire when the Chronicled Wish ends. Pity still carries over.',
    ],
  },
  {
    id: 'guarantee-vs-chance',
    title: 'Worst case vs chance of success',
    summary: '"Guarantee" numbers assume the worst possible luck. The chance figure is how likely you are to actually get it with the pulls you will have.',
    body: [
      'Worst case: every 5★ arrives at hard pity and you lose every 50/50 you can lose. If you have that many pulls, you are certain to get what you want. Starting from 0 pity on a 50/50 that is 180 pulls for a character.',
      'Chance of success: the probability of getting it with the pulls you will actually have, using the published rates, the soft-pity model and the 50/50 win rate setting. Most players get their character well before the worst case.',
      'On the Roadmap, "All-in chance" assumes every pull available by that banner\'s end goes into it.',
    ],
  },
  {
    id: 'roadmap',
    title: 'How the Roadmap spends pulls',
    summary: 'For each banner the planner spends enough for the worst-case guarantee if it can, otherwise enough for one 5★, otherwise nothing. The rest carries forward.',
    body: [
      'Banners are planned in the order you list them. For each one, the planner spends the pulls needed to guarantee everything you asked for (worst case) if you can afford it. If not, it spends just enough to reach the next 5★. If you cannot reach a 5★ by the banner\'s end, it spends nothing and carries all your pulls forward.',
      'The pity and 50/50 or Fate Point state after each banner carries into the next banner of the same kind, assuming the worst case. Use the arrows to reorder stops.',
    ],
  },
  {
    id: 'starglitter',
    title: 'Starglitter',
    summary: 'Starglitter you own converts to fates (5 per fate). Refunds from future pulls are not counted unless you turn on "Count starglitter refunds" in Settings.',
    body: [
      'Starglitter you already have counts toward your pulls at 5 starglitter per Intertwined Fate.',
      'Pulling also refunds starglitter for duplicate 4★ and 5★ items, roughly 10% more pulls for an established F2P account. This is off by default to keep projections conservative; turn it on in Settings → Odds Assumptions.',
    ],
  },
  {
    id: 'your-data',
    title: 'Your data',
    summary: 'Everything is saved in this browser only. Use Settings → Export to back it up or move it to another device.',
    body: [
      'Your data is saved automatically in this browser and never leaves your device. Clearing your browser data or using a different browser or device starts fresh.',
      'Use Settings → Data → Export JSON to save a backup, and Import JSON to restore it.',
    ],
  },
]

export function guideTopic(id: GuideTopicId): GuideTopic {
  const topic = GUIDE.find((t) => t.id === id)
  if (!topic) throw new Error(`Unknown guide topic: ${id}`)
  return topic
}
