import { usePlannerStore } from "@/store/usePlannerStore";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { NumberInput } from "@/components/ui/NumberInput";
import { Toggle } from "@/components/ui/Toggle";
import { parseISO, isWithinInterval, format } from "date-fns";
import type { PatchType } from "@/types";

const PATCH_TYPE_LABELS: Record<PatchType, string> = {
    standard: "Standard",
    "sub-area": "Sub-area",
    "lantern-rite": "Lantern Rite",
    "new-region": "New Region",
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
    } = usePlannerStore();

    const r = config.recurring;

    const today = new Date();
    const currentPatch = patches.find((p) =>
        isWithinInterval(today, { start: parseISO(p.startDate), end: parseISO(p.endDate) })
    );
    const firstPatch = patches[0];
    const beforeAnchor = !currentPatch && firstPatch && today < parseISO(firstPatch.startDate);

    function prevVersion(v: string) {
        const [maj, min] = v.split('.').map(Number);
        return min === 0 ? `${maj - 1}.7` : `${maj}.${min - 1}`;
    }

    const patchScheduleSub = currentPatch
        ? `Currently on v${currentPatch.version} · ends ${format(parseISO(currentPatch.endDate), 'MMM d, yyyy')}`
        : beforeAnchor && firstPatch
        ? `Currently on v${prevVersion(firstPatch.version)} · v${firstPatch.version} starts ${format(parseISO(firstPatch.startDate), 'MMM d, yyyy')}`
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
                    const data = JSON.parse(ev.target?.result as string);
                    usePlannerStore.setState({
                        ...(data.player && { player: data.player }),
                        ...(data.config && { config: data.config }),
                        ...(data.patches && { patches: data.patches }),
                        ...(data.target !== undefined && {
                            target: data.target,
                        }),
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
                <h1 className="text-xl font-semibold text-slate-100">
                    Settings
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    All projection constants are user-editable. Changes take
                    effect immediately.
                </p>
            </div>

            {/* Patch schedule */}
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
                            onChange={(e) =>
                                updateRecurring({
                                    patchAnchorVersion: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="label">Anchor Start Date</label>
                        <input
                            type="date"
                            className="input-base"
                            value={r.patchAnchorDate}
                            onChange={(e) =>
                                updateRecurring({
                                    patchAnchorDate: e.target.value,
                                })
                            }
                        />
                    </div>
                    <NumberInput
                        label="Patch Length (days)"
                        value={r.patchLengthDays}
                        min={21}
                        max={63}
                        onChange={(v) =>
                            updateRecurring({ patchLengthDays: v })
                        }
                        hint="Standard is 42 days"
                    />
                    <NumberInput
                        label="Phase 2 Offset (days from Phase 1)"
                        value={r.phase2OffsetDays}
                        min={7}
                        max={35}
                        onChange={(v) =>
                            updateRecurring({ phase2OffsetDays: v })
                        }
                        hint="Standard is 21 days"
                    />
                    <NumberInput
                        label="Banner Duration (days)"
                        value={r.bannerDurationDays}
                        min={1}
                        max={42}
                        onChange={(v) =>
                            updateRecurring({ bannerDurationDays: v })
                        }
                        hint="Phase start to phase end (default 20)"
                    />
                </div>
            </section>

            {/* Recurring rewards */}
            <section className="card p-5">
                <SectionHeader
                    title="Recurring Rewards"
                    sub="Welkin Moon and Battle Pass are shared with Roadmap; the rest (Commissions, Abyss, Theatre, Stygian, Trials, Monthly Shop) are Next Character only — Roadmap folds those into the Total Wishes per Patch Type estimate below"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <NumberInput
                        label="Daily Commissions (primos/day)"
                        value={r.dailyCommissions}
                        onChange={(v) =>
                            updateRecurring({ dailyCommissions: v })
                        }
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
                        onChange={(v) =>
                            updateRecurring({ imaginariumTheatreMax: v })
                        }
                    />
                    <NumberInput
                        label="Stygian Onslaught (primos/reset)"
                        value={r.stygianOnslaughtMax}
                        onChange={(v) =>
                            updateRecurring({ stygianOnslaughtMax: v })
                        }
                        hint="Occurs 7 days after each patch start"
                    />
                    <NumberInput
                        label="Character Trials (primos/phase)"
                        value={r.trialPrimosPerPhase}
                        onChange={(v) =>
                            updateRecurring({ trialPrimosPerPhase: v })
                        }
                        hint="2 banners × 20 primos = 40 per phase"
                    />
                    <NumberInput
                        label="Monthly Shop (fates/reset, resets 1st)"
                        value={r.monthlyShopIntertwined}
                        onChange={(v) =>
                            updateRecurring({ monthlyShopIntertwined: v })
                        }
                    />
                </div>
            </section>

            {/* Patch type reward estimates */}
            <section className="card p-5">
                <SectionHeader
                    title="Patch Type Rewards"
                    sub="Used by Next Character only — lump-sum EVENT income per patch, split 50/50 across its two phases. Only applied to patches that haven't started yet."
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
                                    patchTypeRewards: {
                                        ...r.patchTypeRewards,
                                        [t]: v,
                                    },
                                })
                            }
                        />
                    ))}
                </div>
            </section>

            {/* Patch type total wish estimates */}
            <section className="card p-5">
                <SectionHeader
                    title="Total Wishes per Patch Type"
                    sub="Used by Roadmap only — an all-inclusive estimate (dailies + Abyss + Theatre + Stygian + Trials + Monthly Shop + events combined), split 50/50 across the patch's two phases."
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

            {/* Patch Maintenance & Livestream */}
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
                            onChange={(v: boolean) =>
                                updateConfig({ maintenanceIncluded: v })
                            }
                        />
                        <NumberInput
                            label="Primos per patch"
                            value={r.maintenancePrimos}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({ maintenancePrimos: v })
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Toggle
                            label="Livestream Codes"
                            checked={config.livestreamIncluded}
                            onChange={(v: boolean) =>
                                updateConfig({ livestreamIncluded: v })
                            }
                        />
                        <NumberInput
                            label="Primos per patch"
                            value={r.livestreamPrimos}
                            min={0}
                            onChange={(v) =>
                                updateRecurring({ livestreamPrimos: v })
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Featured characters */}
            <section className="card p-5">
                <SectionHeader
                    title="Featured Characters"
                    sub="Labels shown for each banner phase"
                />
                <div className="flex flex-col gap-3">
                    {patches.map((patch) => (
                        <div key={patch.id} className="grid sm:grid-cols-3 gap-3 items-end">
                            <span className="text-xs text-slate-500 sm:pb-2">
                                v{patch.version}
                            </span>
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

            {/* Battle Pass */}
            <section className="card p-5">
                <SectionHeader
                    title="Battle Pass"
                    sub="Paid tier only — free tier yields 0 primos"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                    <NumberInput
                        label="Paid — Primos per cycle"
                        value={r.battlePassPaidPrimos}
                        onChange={(v) =>
                            updateRecurring({ battlePassPaidPrimos: v })
                        }
                    />
                    <NumberInput
                        label="Paid — Fates per cycle"
                        value={r.battlePassPaidFates}
                        onChange={(v) =>
                            updateRecurring({ battlePassPaidFates: v })
                        }
                    />
                </div>
            </section>

            {/* Currency */}
            <section className="card p-5">
                <SectionHeader title="Currency" />
                <div className="grid sm:grid-cols-2 gap-4">
                    <NumberInput
                        label="Primogems per Fate"
                        value={r.primoPerFate}
                        onChange={(v) => updateRecurring({ primoPerFate: v })}
                        hint="Standard is 160"
                    />
                    <NumberInput
                        label="Starglitter per Fate"
                        value={r.starglitterPerFate}
                        onChange={(v) =>
                            updateRecurring({ starglitterPerFate: v })
                        }
                        hint="Standard is 5"
                    />
                </div>
            </section>

            {/* Pity thresholds */}
            <section className="card p-5">
                <SectionHeader title="Pity Thresholds" />
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 mb-2">
                        <Toggle
                            label="Strict Guarantee"
                            hint="Calculate 'Can Guarantee' using 180 pulls for 50/50 players."
                            checked={config.strictGuarantee}
                            onChange={(v: boolean) =>
                                updateConfig({ strictGuarantee: v })
                            }
                        />
                    </div>
                    <NumberInput
                        label="Character Soft Pity"
                        value={config.softPityCharacter}
                        onChange={(v) => updateConfig({ softPityCharacter: v })}
                    />
                    <NumberInput
                        label="Character Hard Pity"
                        value={config.hardPityCharacter}
                        onChange={(v) => updateConfig({ hardPityCharacter: v })}
                    />
                    <NumberInput
                        label="Weapon Soft Pity"
                        value={config.softPityWeapon}
                        onChange={(v) => updateConfig({ softPityWeapon: v })}
                    />
                    <NumberInput
                        label="Weapon Hard Pity"
                        value={config.hardPityWeapon}
                        onChange={(v) => updateConfig({ hardPityWeapon: v })}
                    />
                    <NumberInput
                        label="Chronicle Soft Pity"
                        value={config.softPityChronicle}
                        onChange={(v) => updateConfig({ softPityChronicle: v })}
                    />
                    <NumberInput
                        label="Chronicle Hard Pity"
                        value={config.hardPityChronicle}
                        onChange={(v) => updateConfig({ hardPityChronicle: v })}
                    />
                </div>
            </section>

            {/* Data */}
            <section className="card p-5">
                <SectionHeader
                    title="Data"
                    sub="Export or import your planner data"
                />
                <div className="flex flex-wrap gap-3">
                    <button className="btn-secondary" onClick={handleExport}>
                        Export JSON
                    </button>
                    <button className="btn-secondary" onClick={handleImport}>
                        Import JSON
                    </button>
                    <button
                        className="btn-danger"
                        onClick={() => {
                            if (
                                window.confirm(
                                    "Reset all settings to defaults?",
                                )
                            )
                                resetConfig();
                        }}
                    >
                        Reset to Defaults
                    </button>
                </div>
            </section>
        </div>
    );
}
