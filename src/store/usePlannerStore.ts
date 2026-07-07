import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    PlayerState,
    ProjectionConfig,
    RecurringConfig,
    Patch,
    PatchType,
    BannerPhase,
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
    trialPrimosPerPhase: 20,
    bannerDurationDays: 20,
    patchLengthDays: 42,
    phase2OffsetDays: 21,
    patchAnchorVersion: "6.6",
    patchAnchorDate: "2026-05-20",
    primoPerFate: 160,
    starglitterPerFate: 5,
    maintenancePrimos: 600,
    livestreamPrimos: 300,
    patchTypeRewards: {
        standard: 3052,
        "sub-area": 4812,
        "lantern-rite": 9820,
        "new-region": 12140,
    },
    patchTypeTotalWishes: {
        standard: 67,
        "sub-area": 78,
        "lantern-rite": 87,
        "new-region": 128,
    },
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
    maintenanceIncluded: true,
    livestreamIncluded: true,
    softPityCharacter: 74,
    hardPityCharacter: 90,
    softPityChronicle: 74,
    hardPityChronicle: 90,
    softPityWeapon: 63,
    hardPityWeapon: 80,
    strictGuarantee: true,
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

function buildSeedPatches(
    anchor: string,
    anchorVersion: string,
    patchLength: number,
    phase2Offset: number,
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
            patchType: 'standard',
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
        };
        patches.push(patch);
        start = end;
        minor++;
        if (minor >= 8) {
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
        data: Partial<Omit<Patch, "id" | "phases">>,
    ) => void;
    deletePatch: (id: string) => void;
    updatePhase: (
        patchId: string,
        phaseId: string,
        data: Partial<Omit<BannerPhase, "id">>,
    ) => void;
    setPatchType: (patchId: string, type: PatchType) => void;
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
            nav: "next-character",
            player: defaultPlayer,
            config: defaultConfig,
            patches: buildSeedPatches(
                defaultRecurring.patchAnchorDate,
                defaultRecurring.patchAnchorVersion,
                defaultRecurring.patchLengthDays,
                defaultRecurring.phase2OffsetDays,
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
                    version = min >= 7 ? `${maj + 1}.0` : `${maj}.${min + 1}`;
                }

                const newPatch: Patch = {
                    id: nanoid(),
                    version,
                    startDate: format(newStart, "yyyy-MM-dd"),
                    endDate: format(end, "yyyy-MM-dd"),
                    patchType: 'standard',
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

            setPatchType: (patchId, type) =>
                set((s) => ({
                    patches: s.patches.map((p) =>
                        p.id === patchId ? { ...p, patchType: type } : p,
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
                const { patches, chain, config, player } = get();
                const today = new Date();

                let nextPatchId = "";
                let nextPhase: 1 | 2 = 1;

                if (chain.length === 0) {
                    // Find first patch whose phase 1 hasn't started yet
                    for (const patch of patches) {
                        const ph1 = patch.phases.find((ph) => ph.phase === 1);
                        if (ph1 && parseISO(ph1.startDate) > today) {
                            nextPatchId = patch.id;
                            nextPhase = 1;
                            break;
                        }
                    }
                    if (!nextPatchId) {
                        nextPatchId = patches[0]?.id ?? "";
                        nextPhase = 1;
                    }
                } else {
                    const lastStop = chain[chain.length - 1];
                    if (lastStop.phase === 1) {
                        nextPatchId = lastStop.patchId;
                        nextPhase = 2;
                    } else {
                        const patchIdx = patches.findIndex(
                            (p) => p.id === lastStop.patchId,
                        );
                        const nextPatch = patches[patchIdx + 1];
                        nextPatchId =
                            nextPatch?.id ?? patches[0]?.id ?? "";
                        nextPhase = 1;
                    }
                }

                // The first stop starts from the player's actual current pity;
                // later stops assume a fresh cycle since we don't know how prior
                // stops' 5-star luck will land until the chain is simulated.
                const defaultPulls = chain.length === 0
                    ? Math.max(1, config.hardPityCharacter - player.characterBannerPity)
                    : config.hardPityCharacter;

                const stop: ChainStop = {
                    id: nanoid(),
                    patchId: nextPatchId,
                    phase: nextPhase,
                    label: "",
                    pullsToSpend: defaultPulls,
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
            name: "genshin-wish-projection",
            version: 11,
            migrate: (persisted: any) => {
                if (!persisted) return persisted;
                const oldNav = persisted.nav;
                return {
                    ...persisted,
                    nav:
                        oldNav === "dashboard" || oldNav === "forecast"
                            ? "next-character"
                            : oldNav === "scenarios"
                            ? "roadmap"
                            : oldNav,
                    config: {
                        ...defaultConfig,
                        ...persisted.config,
                        recurring: {
                            ...defaultRecurring,
                            ...persisted.config?.recurring,
                        },
                    },
                };
            },
        },
    ),
);
