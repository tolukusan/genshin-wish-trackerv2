import { usePlannerStore } from "@/store/usePlannerStore";
import { runProjection } from "@/engine/projectionEngine";
import { StatCard } from "@/components/ui/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { NumberInput } from "@/components/ui/NumberInput";
import { Toggle } from "@/components/ui/Toggle";
import { format, parseISO } from "date-fns";

function totalCurrentPulls(
    primogems: number,
    genesisCrystals: number,
    fates: number,
) {
    return Math.floor((primogems + genesisCrystals) / 160) + fates;
}

export function Dashboard() {
    const { player, config, patches, target, updatePlayer, setNav } =
        usePlannerStore();

    const forecast = target
        ? runProjection({ player, config, patches, target })
        : null;

    const currentPulls = totalCurrentPulls(
        player.primogems,
        player.genesisCrystals,
        player.intertwinedFates,
    );
    const pityLeft = config.hardPityCharacter - player.characterBannerPity;

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
            {/* Page title */}
            <div>
                <h1 className="text-xl font-semibold text-slate-100">
                    Dashboard
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Your current pull status and forecast at a glance.
                </p>
            </div>

            {/* Current resources */}
            <section>
                <SectionHeader title="Current Resources" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard
                        label="Primogems"
                        value={player.primogems.toLocaleString()}
                        accent="purple"
                        icon="◈"
                    />
                    <StatCard
                        label="Intertwined Fates"
                        value={player.intertwinedFates}
                        accent="gold"
                        icon="✦"
                    />
                    <StatCard
                        label="Total Pulls"
                        value={currentPulls}
                        sub="primogems + fates"
                        accent="purple"
                    />
                    <StatCard
                        label="Char. Pity"
                        value={`${player.characterBannerPity} / 90`}
                        sub={`${pityLeft} to hard pity`}
                        accent={
                            player.characterBannerPity >= 74
                                ? "gold"
                                : "default"
                        }
                    />
                    <StatCard
                        label="50/50 Status"
                        value={
                            player.characterBannerGuaranteed
                                ? "Guaranteed"
                                : "On 50/50"
                        }
                        accent={
                            player.characterBannerGuaranteed
                                ? "green"
                                : "default"
                        }
                    />
                    <StatCard
                        label="Acquaint Fates"
                        value={player.acquaintFates}
                    />
                    <StatCard
                        label="Starglitter"
                        value={player.starglitter}
                        sub={`≈ ${Math.floor(player.starglitter / 5)} fates`}
                    />
                    <StatCard
                        label="Welkin"
                        value={
                            player.welkinActive
                                ? `${player.welkinDaysRemaining}d`
                                : "Inactive"
                        }
                        accent={player.welkinActive ? "green" : "default"}
                    />
                </div>
            </section>

            {/* Quick resource editor */}
            <section className="card p-5">
                <SectionHeader
                    title="Quick Input"
                    sub="Edit your current resources"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <NumberInput
                        label="Primogems"
                        value={player.primogems}
                        onChange={(v) => updatePlayer({ primogems: v })}
                    />
                    <NumberInput
                        label="Intertwined Fates"
                        value={player.intertwinedFates}
                        onChange={(v) => updatePlayer({ intertwinedFates: v })}
                    />
                    <NumberInput
                        label="Acquaint Fates"
                        value={player.acquaintFates}
                        onChange={(v) => updatePlayer({ acquaintFates: v })}
                    />
                    <NumberInput
                        label="Starglitter"
                        value={player.starglitter}
                        onChange={(v) => updatePlayer({ starglitter: v })}
                    />
                    <NumberInput
                        label="Genesis Crystals"
                        value={player.genesisCrystals}
                        onChange={(v) => updatePlayer({ genesisCrystals: v })}
                    />
                    <NumberInput
                        label="Char. Banner Pity"
                        value={player.characterBannerPity}
                        onChange={(v) =>
                            updatePlayer({ characterBannerPity: v })
                        }
                        max={89}
                    />
                    <NumberInput
                        label="Chronicle Pity"
                        value={player.chronicleBannerPity}
                        onChange={(v) =>
                            updatePlayer({ chronicleBannerPity: v })
                        }
                        max={89}
                    />
                    <NumberInput
                        label="Weapon Pity"
                        value={player.weaponBannerPity}
                        onChange={(v) => updatePlayer({ weaponBannerPity: v })}
                        max={79}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700/40">
                    <Toggle
                        label="Guaranteed (lost last 50/50)"
                        checked={player.characterBannerGuaranteed}
                        onChange={(v) =>
                            updatePlayer({ characterBannerGuaranteed: v })
                        }
                    />
                    <Toggle
                        label="Chronicle Guaranteed"
                        checked={player.chronicleBannerGuaranteed}
                        onChange={(v) =>
                            updatePlayer({ chronicleBannerGuaranteed: v })
                        }
                    />
                    <div className="flex flex-col gap-2">
                        <Toggle
                            label="Welkin Moon Active"
                            checked={player.welkinActive}
                            onChange={(v) => updatePlayer({ welkinActive: v })}
                        />
                        {player.welkinActive && (
                            <NumberInput
                                label="Days Remaining"
                                value={player.welkinDaysRemaining}
                                max={180}
                                onChange={(v) =>
                                    updatePlayer({ welkinDaysRemaining: v })
                                }
                            />
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="label">Battle Pass</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['off', 'free', 'paid'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => updatePlayer({ battlePassMode: mode })}
                                    style={{
                                        flex: 1,
                                        padding: '0.375rem 0',
                                        borderRadius: '0.5rem',
                                        border: '1px solid',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        borderColor: player.battlePassMode === mode ? '#7c3aed' : 'rgba(71,85,105,0.6)',
                                        backgroundColor: player.battlePassMode === mode ? 'rgba(124,58,237,0.2)' : 'transparent',
                                        color: player.battlePassMode === mode ? '#a78bfa' : '#94a3b8',
                                        transition: 'all 0.15s',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Forecast summary */}
            <section>
                <SectionHeader
                    title="Forecast"
                    sub={
                        target
                            ? `Target: ${target.label}`
                            : "No target selected"
                    }
                    action={
                        <button
                            className="btn-secondary text-xs px-3 py-1.5"
                            onClick={() => setNav("forecast")}
                        >
                            {target ? "Edit Target" : "Set Target →"}
                        </button>
                    }
                />

                {!target && (
                    <div className="card p-8 text-center">
                        <p className="text-slate-500 text-sm">
                            Set a target banner in the Forecast tab to see your
                            projection.
                        </p>
                        <button
                            className="btn-primary mt-3"
                            onClick={() => setNav("forecast")}
                        >
                            Go to Forecast →
                        </button>
                    </div>
                )}

                {forecast && forecast.atStart.cutoffDate && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <StatCard
                            label="Days to Banner"
                            value={forecast.atStart.daysToTarget}
                            sub={format(parseISO(forecast.atStart.cutoffDate), "MMM d, yyyy")}
                        />
                        <StatCard
                            label="Pulls at Start"
                            value={forecast.atStart.totalPulls}
                            sub={`need ${forecast.pullsNeeded}`}
                            accent={forecast.atStart.totalPulls >= forecast.pullsNeeded ? "green" : "red"}
                        />
                        <StatCard
                            label="Pulls at End"
                            value={forecast.atEnd.totalPulls}
                            sub={`+${config.recurring.bannerDurationDays}d`}
                            accent={forecast.atEnd.totalPulls >= forecast.pullsNeeded ? "green" : "red"}
                        />
                        <StatCard
                            label="Can Guarantee"
                            value={forecast.canGuaranteeAtEnd ? "Yes ✓" : "No ✗"}
                            accent={forecast.canGuaranteeAtEnd ? "green" : "red"}
                        />
                        <StatCard
                            label="Pulls to Pity"
                            value={forecast.pullsToPity}
                            sub={`${forecast.pityAtTarget} / 90 pity`}
                        />
                    </div>
                )}
            </section>

            {/* Chronicle banner */}
            <section className="card p-5">
                <SectionHeader
                    title="Chronicle Banner"
                    sub="Standalone tracker — does not affect main projection"
                />
                <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex-1 min-w-40">
                        <NumberInput
                            label="Chronicle Pity"
                            value={player.chronicleBannerPity}
                            max={89}
                            onChange={(v) =>
                                updatePlayer({ chronicleBannerPity: v })
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <span className="label">Status</span>
                        <div className="flex gap-2 flex-wrap">
                            {player.chronicleBannerPity >=
                                config.softPityChronicle && (
                                <span className="tag-guaranteed">
                                    Soft Pity ({player.chronicleBannerPity}/
                                    {config.softPityChronicle}+)
                                </span>
                            )}
                            {player.chronicleBannerGuaranteed && (
                                <span className="tag-guaranteed">
                                    Guaranteed
                                </span>
                            )}
                            {player.chronicleBannerPity <
                                config.softPityChronicle &&
                                !player.chronicleBannerGuaranteed && (
                                    <span className="text-slate-500 text-sm">
                                        No soft pity yet
                                    </span>
                                )}
                        </div>
                    </div>
                    <Toggle
                        label="Chronicle Guaranteed"
                        checked={player.chronicleBannerGuaranteed}
                        onChange={(v) =>
                            updatePlayer({ chronicleBannerGuaranteed: v })
                        }
                    />
                </div>
            </section>
        </div>
    );
}
