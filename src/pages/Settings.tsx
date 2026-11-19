import { usePlannerStore, migratePersistedState } from "@/store/usePlannerStore";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { NumberInput } from "@/components/ui/NumberInput";
import { Toggle } from "@/components/ui/Toggle";
import { GAME_RULES } from "@/engine/gameRules";
import { parseISO, isWithinInterval, format } from "date-fns";
import type { PatchModifier, PatchType } from "@/types";

const PATCH_TYPE_LABELS: Record<PatchType, string> = {
    standard: "Standard",
    "sub-area": "Sub-area",
    "new-region": "New Region",
};

const PATCH_MODIFIER_LABELS: Record<PatchModifier, string> = {
    anniversary: "Anniversary",
    "lantern-rite": "Lantern Rite",
};

export function Settings() {
    const {
        config,
        patches,
        updateConfig,
        updateRecurring,
        resetConfig,
        rebuildPatchDates,
        updatePhase,
        openGuide,
    } = usePlannerStore();

    const r = config.recurring;

    const today = new Date();
    const currentPatch = patches.find((p) =>
        isWithinInterval(today, { start: parseISO(p.startDate), end: parseISO(p.endDate) })
    );
    const firstPatch = patches[0];
    const beforeAnchor = !currentPatch && firstPatch && today < parseISO(firstPatch.startDate);

    function prevVersion(v: string) {
        const [maj, min] = v.split(".").map(Number);
        return min === 0 ? `${maj - 1}.7` : `${maj}.${min - 1}`;
    }

    const patchScheduleSub = currentPatch
        ? `Currently on v${currentPatch.version} · ends ${format(parseISO(currentPatch.endDate), "MMM d, yyyy")}`
        : beforeAnchor && firstPatch
        ? `Currently on v${prevVersion(firstPatch.version)} · v${firstPatch.version} starts ${format(parseISO(firstPatch.startDate), "MMM d, yyyy")}`
        : firstPatch
        ? `v${firstPatch.version} · ${r.patchLengthDays}d cycles`
        : `${r.patchLengthDays}d cycles from ${r.patchAnchorDate}`;

    const handleExport = () => {
        const { player, config, patches, target, scenarios, chain } =
            usePlannerStore.getState();
        const json = JSON.stringify(
            { player, config, patches, target, scenarios, chain },
            null,
            2,
        );
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "teyvat-planner.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed: unknown = JSON.parse(ev.target?.result as string);
                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Not a planner export");
                    // Exports from older versions are upgraded like browser-saved data.
                    const data = migratePersistedState(parsed);
                    usePlannerStore.setState({
                        ...(data.player && { player: data.player }),
                        ...(data.config && { config: data.config }),
                        ...(data.patches && { patches: data.patches }),
                        ...(data.target !== undefined && { target: data.target }),
                        ...(data.scenarios && { scenarios: data.scenarios }),
                        ...(data.chain && { chain: data.chain }),
                    });
                } catch {
                    alert("Invalid JSON file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    All projection constants are user-editable. Changes take effect immediately.
                </p>
            </div>

            <section className="card p-5">
                <SectionHeader
                    title="Patch Schedule"
                    sub={patchScheduleSub}
                    action={
                        <button
                            className="btn-secondary text-xs px-3 py-1.5"
                            onClick={rebuildPatchDates}
                        >
                            Rebuild Patch Dates
                        </button>
                    }
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="label">Anchor Version</label>
                        <input
                            className="input-base"
                            value={r.patchAnchorVersion}
                            onChange={(e) => updateRecurring({ patchAnchorVersion: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="label">Anchor Start Date</label>
                        <input
                            type="date"
                            className="input-base"
                            value={r.patchAnchorDate}
                            onChange={(e) => updateRecurring({ patchAnchorDate: e.target.value })}
                        />
                    </div>
                    <NumberInput
                        label="Patch Length (days)"
                        value={r.patchLengthDays}
                        min={21}
                        max={63}
                        onChange={(v) => updateRecurring({ patchLengthDays: v })}
                        hint="Standard is 42 days"
                    />
                    <NumberInput
                        label="Phase 2 Offset (days from Phase 1)"
                        value={r.phase2OffsetDays}
                        min={7}
                        max={35}
                        onChange={(v) => updateRecurring({ phase2OffsetDays: v })}
                        hint="Standard is 21 days"
                    />
                    <NumberInput
                        label="Banner Duration (days)"
                        value={r.bannerDurationDays}
                        min={1}
                        max={42}
                        onChange={(v) => updateRecurring({ bannerDurationDays: v })}
                        hint="Phase start to phase end (default 20)"
                    />
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Recurring Rewards"
                    sub="Welkin Moon and Battle Pass are shared with Roadmap; the rest are calculated individually by Next Character."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <NumberInput
                        label="Daily Commissions (primos/day)"
                        value={r.dailyCommissions}
                        onChange={(v) => updateRecurring({ dailyCommissions: v })}
                    />
                    <NumberInput
                        label="Welkin Moon (primos/day)"
                        value={r.welkinDaily}
                        onChange={(v) => updateRecurring({ welkinDaily: v })}
                    />
                    <NumberInput
                        label="Spiral Abyss (primos/reset, resets 16th)"
                        value={r.spiralAbyssMax}
                        onChange={(v) => updateRecurring({ spiralAbyssMax: v })}
                    />
                    <NumberInput
                        label="Imaginarium Theatre (primos/reset, resets 1st)"
                        value={r.imaginariumTheatreMax}
                        onChange={(v) => updateRecurring({ imaginariumTheatreMax: v })}
                    />
                    <NumberInput
                        label="Stygian Onslaught (primos/reset)"
                        value={r.stygianOnslaughtMax}
                        onChange={(v) => updateRecurring({ stygianOnslaughtMax: v })}
                        hint="Occurs 7 days after each patch start"
                    />
                    <NumberInput
                        label="Character Trials (primos/phase)"
                        value={r.trialPrimosPerPhase}
                        onChange={(v) => updateRecurring({ trialPrimosPerPhase: v })}
                        hint="2 banners × 20 primos = 40 per phase"
                    />
                    <NumberInput
                        label="Monthly Shop (fates/reset, resets 1st)"
                        value={r.monthlyShopIntertwined}
                        onChange={(v) => updateRecurring({ monthlyShopIntertwined: v })}
                    />
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Base Content Rewards"
                    sub="Next Character only — event/content income for the patch's base content level. Special bonuses are added separately, then the combined estimate is split 50/50 across phases."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    {(Object.keys(PATCH_TYPE_LABELS) as PatchType[]).map((t) => (
                        <NumberInput
                            key={t}
                            label={`${PATCH_TYPE_LABELS[t]} (primos/patch)`}
                            value={r.patchTypeRewards[t]}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({
                                    patchTypeRewards: { ...r.patchTypeRewards, [t]: v },
                                })
                            }
                        />
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Special Bonus Rewards"
                    sub="Next Character only — additive bonuses. A New Region + Anniversary patch receives both the New Region base and Anniversary bonus."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    {(Object.keys(PATCH_MODIFIER_LABELS) as PatchModifier[]).map((modifier) => (
                        <NumberInput
                            key={modifier}
                            label={`${PATCH_MODIFIER_LABELS[modifier]} bonus (primos/patch)`}
                            value={r.patchModifierRewards[modifier]}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({
                                    patchModifierRewards: {
                                        ...r.patchModifierRewards,
                                        [modifier]: v,
                                    },
                                })
                            }
                        />
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Roadmap Base Wishes"
                    sub="All-inclusive F2P estimate for each base content level. Special bonuses below stack on top and the total is split 50/50 across phases."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    {(Object.keys(PATCH_TYPE_LABELS) as PatchType[]).map((t) => (
                        <NumberInput
                            key={t}
                            label={`${PATCH_TYPE_LABELS[t]} (wishes/patch)`}
                            value={r.patchTypeTotalWishes[t]}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({
                                    patchTypeTotalWishes: {
                                        ...r.patchTypeTotalWishes,
                                        [t]: v,
                                    },
                                })
                            }
                        />
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Roadmap Special Bonuses"
                    sub="Additive all-inclusive wish bonuses for Anniversary and Lantern Rite patches."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    {(Object.keys(PATCH_MODIFIER_LABELS) as PatchModifier[]).map((modifier) => (
                        <NumberInput
                            key={modifier}
                            label={`${PATCH_MODIFIER_LABELS[modifier]} bonus (wishes/patch)`}
                            value={r.patchModifierTotalWishes[modifier]}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({
                                    patchModifierTotalWishes: {
                                        ...r.patchModifierTotalWishes,
                                        [modifier]: v,
                                    },
                                })
                            }
                        />
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Patch Maintenance & Livestream"
                    sub="Used by Next Character only — applied automatically to every patch"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Toggle
                            label="Patch Maintenance"
                            checked={config.maintenanceIncluded}
                            onChange={(v: boolean) => updateConfig({ maintenanceIncluded: v })}
                        />
                        <NumberInput
                            label="Primos per patch"
                            value={r.maintenancePrimos}
                            min={0}
                            onChange={(v) => updateRecurring({ maintenancePrimos: v })}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Toggle
                            label="Livestream Codes"
                            checked={config.livestreamIncluded}
                            onChange={(v: boolean) => updateConfig({ livestreamIncluded: v })}
                        />
                        <NumberInput
                            label="Primos per patch"
                            value={r.livestreamPrimos}
                            min={0}
                            onChange={(v) => updateRecurring({ livestreamPrimos: v })}
                        />
                    </div>
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader title="Featured Characters" sub="Optional: add names once a banner is announced. They only label banners in the pickers and do not change any numbers." />
                <div className="flex flex-col gap-3">
                    {patches.map((patch) => (
                        <div key={patch.id} className="grid sm:grid-cols-3 gap-3 items-end">
                            <span className="text-xs text-slate-500 sm:pb-2">v{patch.version}</span>
                            {patch.phases.map((phase) => (
                                <div key={phase.id} className="flex flex-col gap-1">
                                    <label className="label">Phase {phase.phase}</label>
                                    <input
                                        className="input-base text-xs"
                                        placeholder="e.g. Mavuika"
                                        value={phase.featuredCharacters.join(", ")}
                                        onChange={(e) =>
                                            updatePhase(patch.id, phase.id, {
                                                featuredCharacters: e.target.value
                                                    .split(",")
                                                    .map((s) => s.trim()),
                                            })
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Odds Assumptions"
                    sub="Educated guesses that players disagree on. They change the chance figures and projected pulls, never the worst-case numbers."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <NumberInput
                            label="50/50 Win Rate (%)"
                            value={config.fiftyFiftyWinPercent ?? 55}
                            onChange={(v) => updateConfig({ fiftyFiftyWinPercent: v })}
                            min={50}
                            max={100}
                            hint="Used only for chance of success. Capturing Radiance makes it ~55–59% in practice; worst-case guarantees still assume a loss."
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Toggle
                            label="Count starglitter refunds"
                            hint="Adds an estimate of fates refunded from 4★/5★ duplicates to projected pulls. Off keeps projections conservative."
                            checked={config.starglitterRefundIncluded ?? false}
                            onChange={(v: boolean) => updateConfig({ starglitterRefundIncluded: v })}
                        />
                    </div>
                    {config.starglitterRefundIncluded && (
                        <NumberInput
                            label="Starglitter Refund (%)"
                            value={r.starglitterRefundPercent ?? 10}
                            onChange={(v) => updateRecurring({ starglitterRefundPercent: v })}
                            max={30}
                            hint="Community estimate is ~10% for F2P accounts"
                        />
                    )}
                </div>
            </section>

            <section className="card p-5">
                <SectionHeader
                    title="Game Rules"
                    sub="Fixed by the game, so they are not editable. Every calculation uses these values."
                />
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-700">
                    <li>5★ guaranteed by pull <b>{GAME_RULES.hardPity.character}</b> on character and Chronicled banners, <b>{GAME_RULES.hardPity.weapon}</b> on the weapon banner</li>
                    <li>Soft pity (rate climbs) from pull <b>{GAME_RULES.softPity.character}</b>, weapon <b>{GAME_RULES.softPity.weapon}</b></li>
                    <li>After a lost 50/50 or with a Fate Point, the next 5★ is the featured or chosen item</li>
                    <li><b>{GAME_RULES.primogemsPerFate}</b> primogems or <b>{GAME_RULES.starglitterPerFate}</b> starglitter per Intertwined Fate</li>
                    <li>Paid Battle Pass: <b>{GAME_RULES.battlePassPaid.primogems}</b> primogems + <b>{GAME_RULES.battlePassPaid.fates}</b> fates per patch (free tier: none)</li>
                </ul>
                <button className="mt-3 text-xs font-semibold text-accent-purple hover:underline" onClick={() => openGuide("pity")}>
                    How pity and guarantees work →
                </button>
            </section>

            <section className="card p-5">
                <SectionHeader title="Data" sub="Export or import your planner data" />
                <div className="flex flex-wrap gap-3">
                    <button className="btn-secondary" onClick={handleExport}>Export JSON</button>
                    <button className="btn-secondary" onClick={handleImport}>Import JSON</button>
                    <button
                        className="btn-danger"
                        onClick={() => {
                            if (window.confirm("Reset all settings to defaults?")) resetConfig();
                        }}
                    >
                        Reset to Defaults
                    </button>
                </div>
            </section>
        </div>
    );
}
