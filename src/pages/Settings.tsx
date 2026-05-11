import { usePlannerStore } from "@/store/usePlannerStore";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { NumberInput } from "@/components/ui/NumberInput";
import { useState, useEffect } from "react";
import {
    driveSignIn, driveSignOut, driveIsSignedIn,
    driveSave, driveLoad,
    getStoredClientId, setStoredClientId,
    getLastSyncTime, setLastSyncTime,
} from "@/utils/googleDrive";

export function Settings() {
    const {
        config,
        updateConfig,
        updateRecurring,
        resetConfig,
        rebuildPatchDates,
    } = usePlannerStore();

    const [clientId, setClientId] = useState(getStoredClientId)
    const [driveConnected, setDriveConnected] = useState(driveIsSignedIn)
    const [driveStatus, setDriveStatus] = useState<string | null>(null)
    const [lastSync, setLastSync] = useState(getLastSyncTime)

    useEffect(() => { setStoredClientId(clientId) }, [clientId])

    async function handleConnect() {
        if (!clientId.trim()) { setDriveStatus('Enter a Client ID first.'); return }
        setDriveStatus('Connecting…')
        try {
            await driveSignIn(clientId)
            setDriveConnected(true)
            setDriveStatus('Connected.')
        } catch {
            setDriveStatus('Sign-in failed. Check your Client ID and authorized origins.')
        }
    }

    function handleDisconnect() {
        driveSignOut()
        setDriveConnected(false)
        setDriveStatus(null)
    }

    async function handleSaveToDrive() {
        setDriveStatus('Saving…')
        try {
            const { player, config: cfg, patches, target, scenarios, chain } = usePlannerStore.getState()
            await driveSave({ player, config: cfg, patches, target, scenarios, chain })
            setLastSyncTime()
            setLastSync(getLastSyncTime())
            setDriveStatus('Saved to Drive ✓')
        } catch (e: any) {
            setDriveStatus(`Save failed: ${e.message}`)
        }
    }

    async function handleLoadFromDrive() {
        setDriveStatus('Loading…')
        try {
            const data = await driveLoad() as any
            if (!data) { setDriveStatus('No Drive data found.'); return }
            usePlannerStore.setState({
                ...(data.player && { player: data.player }),
                ...(data.config && { config: data.config }),
                ...(data.patches && { patches: data.patches }),
                ...(data.target !== undefined && { target: data.target }),
                ...(data.scenarios && { scenarios: data.scenarios }),
                ...(data.chain && { chain: data.chain }),
            })
            setLastSyncTime()
            setLastSync(getLastSyncTime())
            setDriveStatus('Loaded from Drive ✓')
        } catch (e: any) {
            setDriveStatus(`Load failed: ${e.message}`)
        }
    }
    const r = config.recurring;

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
                    sub="Anchor patch and cadence"
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
                    sub="Default primo values — all user-editable"
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

            {/* Default patch events */}
            <section className="card p-5">
                <SectionHeader
                    title="Default Patch Events"
                    sub="Pre-added to every new patch. Edit or delete per patch in the Patches tab."
                />
                <div className="grid sm:grid-cols-3 gap-4">
                    <NumberInput
                        label="Events per patch"
                        value={r.defaultEventCount}
                        min={0}
                        max={10}
                        onChange={(v) =>
                            updateRecurring({ defaultEventCount: v })
                        }
                    />
                    <NumberInput
                        label="Primos per event"
                        value={r.defaultEventPrimos}
                        min={0}
                        onChange={(v) =>
                            updateRecurring({ defaultEventPrimos: v })
                        }
                        hint="420 = standard event reward"
                    />
                    <NumberInput
                        label="Phase 2 events"
                        value={r.defaultEventPhase2Count}
                        min={0}
                        max={r.defaultEventCount}
                        onChange={(v) =>
                            updateRecurring({ defaultEventPhase2Count: v })
                        }
                        hint="Rest are Phase 1"
                    />
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

            {/* Google Drive */}
            <section className="card p-5">
                <SectionHeader
                    title="Google Drive Sync"
                    sub="Save your planner data to Google Drive so it's available on any device"
                />
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="label">OAuth Client ID</label>
                        <input
                            className="input-base"
                            placeholder="Paste your Google OAuth 2.0 Client ID"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            disabled={driveConnected}
                        />
                        <p className="text-xs text-slate-500">
                            Create a project in{' '}
                            <a
                                href="https://console.cloud.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-purple-light hover:underline"
                            >
                                Google Cloud Console
                            </a>
                            , enable the Drive API, create OAuth 2.0 credentials (Web app), and add your site URL as an authorized origin.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {!driveConnected ? (
                            <button className="btn-primary" onClick={handleConnect}>
                                Connect Google Drive
                            </button>
                        ) : (
                            <>
                                <button className="btn-primary" onClick={handleSaveToDrive}>
                                    Save to Drive
                                </button>
                                <button className="btn-secondary" onClick={handleLoadFromDrive}>
                                    Load from Drive
                                </button>
                                <button className="btn-danger" onClick={handleDisconnect}>
                                    Disconnect
                                </button>
                            </>
                        )}
                        {driveStatus && (
                            <span className="text-xs" style={{ color: driveStatus.includes('✓') ? '#34d399' : driveStatus.includes('failed') || driveStatus.includes('failed') ? '#f87171' : '#94a3b8' }}>
                                {driveStatus}
                            </span>
                        )}
                    </div>

                    {lastSync && (
                        <p className="text-xs text-slate-500">
                            Last synced: {new Date(lastSync).toLocaleString()}
                        </p>
                    )}
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
