import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    PlayerState,
    ProjectionConfig,
    RecurringConfig,
    Patch,
    BannerPhase,
    PatchEvent,
    Target,
    Scenario,
    ChainStop,
    NavTab,
} from "@/types";
import { addDays, parseISO, format } from "date-fns";
import { nanoid } from "@/utils/nanoid";

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultRecurring: RecurringConfig = {
    dailyCommissions: 60,
    welkinDaily: 90,
    spiralAbyssMax: 800,
    imaginariumTheatreMax: 1000,
    stygianOnslaughtMax: 450,
    monthlyShopIntertwined: 5,
    battlePassPaidPrimos: 680,
    battlePassPaidFates: 4,
    trialPrimosPerPhase: 40,
    defaultEventCount: 3,
    defaultEventPrimos: 420,
    defaultEventPhase2Count: 1,
    bannerDurationDays: 20,
    patchLengthDays: 42,
    phase2OffsetDays: 21,
    patchAnchorVersion: "6.6",
    patchAnchorDate: "2026-05-20",
    primoPerFate: 160,
    starglitterPerFate: 5,
};

const defaultConfig: ProjectionConfig = {
    recurring: defaultRecurring,
    commissionsIncluded: true,
    welkinIncluded: false,
    spiralAbyssEnabled: true,
    imaginariumTheatreEnabled: true,
    stygianOnslaughtEnabled: true,
    characterTrialsEnabled: true,
    battlePassIncluded: false,
    monthlyShopIncluded: true,
    softPityCharacter: 74,
    hardPityCharacter: 90,
    softPityChronicle: 74,
    hardPityChronicle: 90,
    softPityWeapon: 63,
    hardPityWeapon: 80,
};

const defaultPlayer: PlayerState = {
    primogems: 0,
    intertwinedFates: 0,
    acquaintFates: 0,
    starglitter: 0,
    stardust: 0,
    genesisCrystals: 0,
    characterBannerPity: 0,
    characterBanner4Pity: 0,
    characterBannerGuaranteed: false,
    weaponBannerPity: 0,
    weaponBannerFatePoints: 0,
    standardBannerPity: 0,
    chronicleBannerPity: 0,
    chronicleBannerGuaranteed: false,
    welkinActive: false,
    welkinDaysRemaining: 0,
    battlePassMode: "off",
};

function buildDefaultEvents(
    count: number,
    primosEach: number,
    phase2Count: number,
): PatchEvent[] {
    const phase1Count = Math.max(0, count - phase2Count);
    return Array.from({ length: count }, (_, i) => ({
        id: nanoid(),
        name: `Event ${i + 1}`,
        primogems: primosEach,
        fates: 0,
        phase: i < phase1Count ? (1 as const) : (2 as const),
        enabled: true,
    }));
}

function buildSeedPatches(
    anchor: string,
    anchorVersion: string,
    patchLength: number,
    phase2Offset: number,
    eventCount: number,
    eventPrimos: number,
    eventPhase2Count: number,
): Patch[] {
    const patches: Patch[] = [];
    const [majorStr, minorStr] = anchorVersion.split(".");
    let major = parseInt(majorStr);
    let minor = parseInt(minorStr);
    let start = parseISO(anchor);

    for (let i = 0; i < 10; i++) {
        const end = addDays(start, patchLength);
        const p1End = addDays(start, phase2Offset);

        const patch: Patch = {
            id: nanoid(),
            version: `${major}.${minor}`,
            startDate: format(start, "yyyy-MM-dd"),
            endDate: format(end, "yyyy-MM-dd"),
            events: buildDefaultEvents(
                eventCount,
                eventPrimos,
                eventPhase2Count,
            ),
            phases: [
                {
                    id: nanoid(),
                    phase: 1,
                    startDate: format(start, "yyyy-MM-dd"),
                    endDate: format(p1End, "yyyy-MM-dd"),
                    featuredCharacters: [""],
                },
                {
                    id: nanoid(),
                    phase: 2,
                    startDate: format(p1End, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                    featuredCharacters: [""],
                },
            ],
            maintenancePrimos: 600,
            livestreamPrimos: 300,
            maintenanceEnabled: true,
            livestreamEnabled: true,
        };
        patches.push(patch);
        start = end;
        minor++;
        if (minor > 9) {
            major++;
            minor = 0;
        }
    }
    return patches;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface PlannerStore {
    nav: NavTab;
    player: PlayerState;
    config: ProjectionConfig;
    patches: Patch[];
    target: Target | null;
    scenarios: Scenario[];
    chain: ChainStop[];

    setNav: (tab: NavTab) => void;
    updatePlayer: (patch: Partial<PlayerState>) => void;
    updateConfig: (patch: Partial<ProjectionConfig>) => void;
    updateRecurring: (patch: Partial<RecurringConfig>) => void;
    resetConfig: () => void;
    addPatch: () => void;
    updatePatch: (
        id: string,
        data: Partial<Omit<Patch, "id" | "phases" | "events">>,
    ) => void;
    deletePatch: (id: string) => void;
    updatePhase: (
        patchId: string,
        phaseId: string,
        data: Partial<Omit<BannerPhase, "id">>,
    ) => void;
    addEvent: (patchId: string) => void;
    updateEvent: (
        patchId: string,
        eventId: string,
        data: Partial<Omit<PatchEvent, "id">>,
    ) => void;
    deleteEvent: (patchId: string, eventId: string) => void;
    toggleEvent: (patchId: string, eventId: string) => void;
    setTarget: (t: Target | null) => void;
    addScenario: () => void;
    updateScenario: (id: string, data: Partial<Omit<Scenario, "id">>) => void;
    deleteScenario: (id: string) => void;
    rebuildPatchDates: () => void;
    addChainStop: () => void;
    updateChainStop: (id: string, data: Partial<Omit<ChainStop, "id">>) => void;
    deleteChainStop: (id: string) => void;
    moveChainStop: (id: string, direction: "up" | "down") => void;
}

export const usePlannerStore = create<PlannerStore>()(
    persist(
        (set, get) => ({
            nav: "dashboard",
            player: defaultPlayer,
            config: defaultConfig,
            patches: buildSeedPatches(
                defaultRecurring.patchAnchorDate,
                defaultRecurring.patchAnchorVersion,
                defaultRecurring.patchLengthDays,
                defaultRecurring.phase2OffsetDays,
                defaultRecurring.defaultEventCount,
                defaultRecurring.defaultEventPrimos,
                defaultRecurring.defaultEventPhase2Count,
            ),
            target: null,
            scenarios: [],
            chain: [],

            setNav: (tab) => set({ nav: tab }),

            updatePlayer: (patch) =>
                set((s) => ({ player: { ...s.player, ...patch } })),

            updateConfig: (patch) =>
                set((s) => ({ config: { ...s.config, ...patch } })),

            updateRecurring: (patch) =>
                set((s) => ({
                    config: {
                        ...s.config,
                        recurring: { ...s.config.recurring, ...patch },
                    },
                })),

            resetConfig: () => set({ config: defaultConfig }),

            addPatch: () => {
                const { patches, config } = get();
                const r = config.recurring;
                const last = patches[patches.length - 1];
                const newStart = last
                    ? parseISO(last.endDate)
                    : parseISO(r.patchAnchorDate);
                const end = addDays(newStart, r.patchLengthDays);
                const p1End = addDays(newStart, r.phase2OffsetDays);

                let version = r.patchAnchorVersion;
                if (last) {
                    const [maj, min] = last.version.split(".").map(Number);
                    version = min >= 9 ? `${maj + 1}.0` : `${maj}.${min + 1}`;
                }

                const newPatch: Patch = {
                    id: nanoid(),
                    version,
                    startDate: format(newStart, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                    events: buildDefaultEvents(
                        r.defaultEventCount,
                        r.defaultEventPrimos,
                        r.defaultEventPhase2Count,
                    ),
                    phases: [
                        {
                            id: nanoid(),
                            phase: 1,
                            startDate: format(newStart, "yyyy-MM-dd"),
                            endDate: format(p1End, "yyyy-MM-dd"),
                            featuredCharacters: [""],
                        },
                        {
                            id: nanoid(),
                            phase: 2,
                            startDate: format(p1End, "yyyy-MM-dd"),
                            endDate: format(end, "yyyy-MM-dd"),
                            featuredCharacters: [""],
                        },
                    ],
                    maintenancePrimos: 600,
                    livestreamPrimos: 300,
                    maintenanceEnabled: true,
                    livestreamEnabled: true,
                };
                set({ patches: [...patches, newPatch] });
            },

            updatePatch: (id, data) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === id ? { ...p, ...data } : p,
                    ),
                })),

            deletePatch: (id) =>
                set((s) => ({ patches: s.patches.filter((p) => p.id !== id) })),

            updatePhase: (patchId, phaseId, data) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId
                            ? {
                                  ...p,
                                  phases: p.phases.map((ph) =>
                                      ph.id === phaseId
                                          ? { ...ph, ...data }
                                          : ph,
                                  ),
                              }
                            : p,
                    ),
                })),

            addEvent: (patchId) => {
                const ev: PatchEvent = {
                    id: nanoid(),
                    name: "New Event",
                    primogems: 0,
                    enabled: true,
                };
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId
                            ? { ...p, events: [...p.events, ev] }
                            : p,
                    ),
                }));
            },

            updateEvent: (patchId, eventId, data) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId
                            ? {
                                  ...p,
                                  events: p.events.map((e) =>
                                      e.id === eventId ? { ...e, ...data } : e,
                                  ),
                              }
                            : p,
                    ),
                })),

            deleteEvent: (patchId, eventId) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId
                            ? {
                                  ...p,
                                  events: p.events.filter(
                                      (e) => e.id !== eventId,
                                  ),
                              }
                            : p,
                    ),
                })),

            toggleEvent: (patchId, eventId) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId
                            ? {
                                  ...p,
                                  events: p.events.map((e) =>
                                      e.id === eventId
                                          ? { ...e, enabled: !e.enabled }
                                          : e,
                                  ),
                              }
                            : p,
                    ),
                })),

            setTarget: (t) => set({ target: t }),

            addScenario: () => {
                const { player } = get();
                const sc: Scenario = {
                    id: nanoid(),
                    name: "New Scenario",
                    pullsSpent: 0,
                    pityAfter: player.characterBannerPity,
                    guaranteedAfter: player.characterBannerGuaranteed,
                };
                set((s) => ({ scenarios: [...s.scenarios, sc] }));
            },

            updateScenario: (id, data) =>
                set((s) => ({
                    scenarios: s.scenarios.map((sc) =>
                        sc.id === id ? { ...sc, ...data } : sc,
                    ),
                })),

            deleteScenario: (id) =>
                set((s) => ({
                    scenarios: s.scenarios.filter((sc) => sc.id !== id),
                })),

            addChainStop: () => {
                const { patches } = get();
                const firstPatch = patches[0];
                const stop: ChainStop = {
                    id: nanoid(),
                    patchId: firstPatch?.id ?? "",
                    phase: 1,
                    label: "",
                    pullsToSpend: 90,
                };
                set((s) => ({ chain: [...s.chain, stop] }));
            },

            updateChainStop: (id, data) =>
                set((s) => ({
                    chain: s.chain.map((c) =>
                        c.id === id ? { ...c, ...data } : c,
                    ),
                })),

            deleteChainStop: (id) =>
                set((s) => ({ chain: s.chain.filter((c) => c.id !== id) })),

            moveChainStop: (id, direction) =>
                set((s) => {
                    const idx = s.chain.findIndex((c) => c.id === id);
                    if (idx < 0) return s;
                    const next = direction === "up" ? idx - 1 : idx + 1;
                    if (next < 0 || next >= s.chain.length) return s;
                    const arr = [...s.chain];
                    [arr[idx], arr[next]] = [arr[next], arr[idx]];
                    return { chain: arr };
                }),

            rebuildPatchDates: () => {
                const { patches, config } = get();
                if (patches.length === 0) return;
                const { patchLengthDays, phase2OffsetDays } = config.recurring;
                let start = parseISO(patches[0].startDate);

                const updated = patches.map((p) => {
                    const end = addDays(start, patchLengthDays);
                    const p1End = addDays(start, phase2OffsetDays);
                    const s = start;
                    start = end;
                    return {
                        ...p,
                        startDate: format(s, "yyyy-MM-dd"),
                        endDate: format(end, "yyyy-MM-dd"),
                        phases: p.phases.map((ph) =>
                            ph.phase === 1
                                ? {
                                      ...ph,
                                      startDate: format(s, "yyyy-MM-dd"),
                                      endDate: format(p1End, "yyyy-MM-dd"),
                                  }
                                : {
                                      ...ph,
                                      startDate: format(p1End, "yyyy-MM-dd"),
                                      endDate: format(end, "yyyy-MM-dd"),
                                  },
                        ),
                    };
                });
                set({ patches: updated });
            },
        }),
        {
            name: "teyvat-pull-planner",
            version: 6,
        },
    ),
);
