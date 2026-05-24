import { usePlannerStore } from "@/store/usePlannerStore";
import { clsx } from "clsx";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { useState } from "react";
import type { Patch, PatchType } from "@/types";

export function Patches() {
    const {
        patches,
        addPatch,
        updatePatch,
        deletePatch,
        updatePhase,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleEvent,
        setPatchType,
    } = usePlannerStore();
    const [expandedId, setExpandedId] = useState<string | null>(
        patches[0]?.id ?? null,
    );

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">
                        Patches
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage patch timelines, banner phases, and custom
                        events.
                    </p>
                </div>
                <button className="btn-primary" onClick={addPatch}>
                    + Add Patch
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {patches.map((patch) => (
                    <PatchCard
                        key={patch.id}
                        patch={patch}
                        expanded={expandedId === patch.id}
                        onToggleExpand={() =>
                            setExpandedId(
                                expandedId === patch.id ? null : patch.id,
                            )
                        }
                        onUpdatePatch={(data) => updatePatch(patch.id, data)}
                        onDeletePatch={() => deletePatch(patch.id)}
                        onUpdatePhase={(phId, data) =>
                            updatePhase(patch.id, phId, data)
                        }
                        onAddEvent={() => addEvent(patch.id)}
                        onUpdateEvent={(evId, data) =>
                            updateEvent(patch.id, evId, data)
                        }
                        onDeleteEvent={(evId) => deleteEvent(patch.id, evId)}
                        onToggleEvent={(evId) => toggleEvent(patch.id, evId)}
                        onSetPatchType={(type) => setPatchType(patch.id, type)}
                    />
                ))}
                {patches.length === 0 && (
                    <div className="card p-8 text-center">
                        <p className="text-slate-500 text-sm">
                            No patches yet. Add one to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

const PATCH_TYPE_LABELS: Record<PatchType, string> = {
    standard: "Standard",
    "sub-area": "Sub-area",
    "lantern-rite": "Lantern Rite",
    "new-region": "New Region",
};

const PATCH_TYPE_WISHES: Record<PatchType, string> = {
    standard: "~67 wishes",
    "sub-area": "~78 wishes",
    "lantern-rite": "~109 wishes",
    "new-region": "~123 wishes",
};

interface PatchCardProps {
    patch: Patch;
    expanded: boolean;
    onToggleExpand: () => void;
    onUpdatePatch: (
        data: Partial<Omit<Patch, "id" | "phases" | "events">>,
    ) => void;
    onDeletePatch: () => void;
    onUpdatePhase: (phId: string, data: any) => void;
    onAddEvent: () => void;
    onUpdateEvent: (evId: string, data: any) => void;
    onDeleteEvent: (evId: string) => void;
    onToggleEvent: (evId: string) => void;
    onSetPatchType: (type: PatchType) => void;
}

function PatchCard({
    patch,
    expanded,
    onToggleExpand,
    onUpdatePatch,
    onDeletePatch,
    onUpdatePhase,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onToggleEvent,
    onSetPatchType,
}: PatchCardProps) {
    const { config, player } = usePlannerStore();
    const r = config.recurring;
    const [showAdvanced, setShowAdvanced] = useState(false);

    const totalEvents = patch.events.filter((e) => e.enabled).length;
    const totalEventPrimos = patch.events
        .filter((e) => e.enabled)
        .reduce((s, e) => s + e.primogems, 0);
    const totalEventFates = patch.events
        .filter((e) => e.enabled)
        .reduce((s, e) => s + (e.fates ?? 0), 0);

    // Per-patch income breakdown — exact values from patch dates
    const patchStart = parseISO(patch.startDate);
    const patchEnd = parseISO(patch.endDate);
    const patchDays = differenceInDays(patchEnd, patchStart);

    function countDayOfMonth(from: Date, to: Date, day: number): number {
        const days = differenceInDays(to, from);
        let count = 0;
        for (let d = 0; d < days; d++) {
            if (addDays(from, d).getDate() === day) count++;
        }
        return count;
    }

    // Welkin overlap: how many of this patch's days fall within the player's welkin window
    const today = new Date()
    const welkinExpiry = addDays(today, player.welkinDaysRemaining)
    const overlapStart = patchStart > today ? patchStart : today
    const overlapEnd = patchEnd < welkinExpiry ? patchEnd : welkinExpiry
    const welkinDays = player.welkinActive ? Math.max(0, differenceInDays(overlapEnd, overlapStart)) : 0
    const welkinPrimos = welkinDays * r.welkinDaily

    const maintenancePrimos = patch.maintenanceEnabled
        ? (patch.maintenancePrimos ?? 600)
        : 0;
    const livestreamPrimos = patch.livestreamEnabled
        ? (patch.livestreamPrimos ?? 300)
        : 0;
    const commissionPrimos = r.dailyCommissions * patchDays;
    const abyssResets = countDayOfMonth(patchStart, patchEnd, 16);
    const abysspPrimos = abyssResets * r.spiralAbyssMax;
    const theatreResets = countDayOfMonth(patchStart, patchEnd, 1);
    const theatrePrimos = theatreResets * r.imaginariumTheatreMax;
    const shopFates = theatreResets * r.monthlyShopIntertwined;
    const stygianPrimos = r.stygianOnslaughtMax; // always 1 per patch (start + 7)
    const trialPrimos = r.trialPrimosPerPhase * 2;

    const totalConfiguredPrimos =
        maintenancePrimos + livestreamPrimos + totalEventPrimos;
    const totalFixedPrimos =
        commissionPrimos +
        welkinPrimos +
        abysspPrimos +
        theatrePrimos +
        stygianPrimos +
        trialPrimos;
    const grandTotalPrimos = totalConfiguredPrimos + totalFixedPrimos;
    const grandTotalFates =
        Math.floor(grandTotalPrimos / r.primoPerFate) +
        totalEventFates +
        shopFates;
    const estimatedWishes = grandTotalFates;

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggleExpand}
                onKeyDown={(e) => e.key === "Enter" && onToggleExpand()}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <span className="text-accent-purple font-semibold text-sm w-10">
                        v{patch.version}
                    </span>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-200 text-sm font-medium">
                                {format(parseISO(patch.startDate), "MMM d")} –{" "}
                                {format(parseISO(patch.endDate), "MMM d, yyyy")}
                            </span>
                            <span
                                style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: 4,
                                    backgroundColor: "rgba(124,58,237,0.15)",
                                    color: "#a78bfa",
                                    border: "1px solid rgba(124,58,237,0.25)",
                                }}
                            >
                                {
                                    PATCH_TYPE_LABELS[
                                        patch.patchType ?? "standard"
                                    ]
                                }
                            </span>
                        </div>
                        <span className="text-xs text-slate-500">
                            {patch.phases[0]?.featuredCharacters[0] ||
                                "Phase 1 TBD"}{" "}
                            ·{" "}
                            {patch.phases[1]?.featuredCharacters[0] ||
                                "Phase 2 TBD"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeletePatch();
                        }}
                        className="btn-danger px-2 py-1 text-xs"
                    >
                        Delete
                    </button>
                    <span className="text-slate-500 text-sm">
                        {expanded ? "▲" : "▼"}
                    </span>
                </div>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div className="border-t border-slate-700/50 p-4 flex flex-col gap-5">
                    {/* Patch meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="label">Version</label>
                            <input
                                className="input-base"
                                value={patch.version}
                                onChange={(e) =>
                                    onUpdatePatch({ version: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                className="input-base"
                                value={patch.startDate}
                                onChange={(e) =>
                                    onUpdatePatch({ startDate: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="label">End Date</label>
                            <input
                                type="date"
                                className="input-base"
                                value={patch.endDate}
                                onChange={(e) =>
                                    onUpdatePatch({ endDate: e.target.value })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="label">Patch Type</label>
                            <select
                                className="input-base"
                                value={patch.patchType ?? "standard"}
                                onChange={(e) =>
                                    onSetPatchType(e.target.value as PatchType)
                                }
                            >
                                {(
                                    Object.keys(
                                        PATCH_TYPE_LABELS,
                                    ) as PatchType[]
                                ).map((t) => (
                                    <option key={t} value={t}>
                                        {PATCH_TYPE_LABELS[t]} —{" "}
                                        {PATCH_TYPE_WISHES[t]}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-600">
                                Replaces event defaults
                            </p>
                        </div>
                    </div>

                    {/* Maintenance & Livestream */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-navy-800/60 rounded-lg p-3 border border-slate-700/40 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-300">
                                    Patch Maintenance
                                </span>
                                <button
                                    onClick={() =>
                                        onUpdatePatch({
                                            maintenanceEnabled:
                                                !patch.maintenanceEnabled,
                                        })
                                    }
                                    style={{
                                        width: 32,
                                        height: 18,
                                        borderRadius: 9999,
                                        border: "none",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                        backgroundColor:
                                            patch.maintenanceEnabled
                                                ? "#7c3aed"
                                                : "#475569",
                                        transition: "background-color 0.2s",
                                        position: "relative",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: 2,
                                            left: 2,
                                            width: 14,
                                            height: 14,
                                            borderRadius: 9999,
                                            backgroundColor: "white",
                                            transition: "transform 0.2s",
                                            transform: patch.maintenanceEnabled
                                                ? "translateX(14px)"
                                                : "translateX(0)",
                                        }}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="input-base text-xs"
                                    value={patch.maintenancePrimos ?? 600}
                                    min={0}
                                    disabled={!patch.maintenanceEnabled}
                                    style={{
                                        opacity: patch.maintenanceEnabled
                                            ? 1
                                            : 0.4,
                                    }}
                                    onChange={(e) =>
                                        onUpdatePatch({
                                            maintenancePrimos:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                                <span className="text-xs text-slate-500 shrink-0">
                                    primos
                                </span>
                            </div>
                        </div>
                        <div className="bg-navy-800/60 rounded-lg p-3 border border-slate-700/40 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-300">
                                    Livestream Codes
                                </span>
                                <button
                                    onClick={() =>
                                        onUpdatePatch({
                                            livestreamEnabled:
                                                !patch.livestreamEnabled,
                                        })
                                    }
                                    style={{
                                        width: 32,
                                        height: 18,
                                        borderRadius: 9999,
                                        border: "none",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                        backgroundColor: patch.livestreamEnabled
                                            ? "#7c3aed"
                                            : "#475569",
                                        transition: "background-color 0.2s",
                                        position: "relative",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: 2,
                                            left: 2,
                                            width: 14,
                                            height: 14,
                                            borderRadius: 9999,
                                            backgroundColor: "white",
                                            transition: "transform 0.2s",
                                            transform: patch.livestreamEnabled
                                                ? "translateX(14px)"
                                                : "translateX(0)",
                                        }}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="input-base text-xs"
                                    value={patch.livestreamPrimos ?? 300}
                                    min={0}
                                    disabled={!patch.livestreamEnabled}
                                    style={{
                                        opacity: patch.livestreamEnabled
                                            ? 1
                                            : 0.4,
                                    }}
                                    onChange={(e) =>
                                        onUpdatePatch({
                                            livestreamPrimos:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                                <span className="text-xs text-slate-500 shrink-0">
                                    primos
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Phases */}
                    <div>
                        <p className="label mb-2">Banner Phases</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {patch.phases.map((phase) => (
                                <div
                                    key={phase.id}
                                    className="bg-navy-800/60 rounded-lg p-3 flex flex-col gap-2 border border-slate-700/40"
                                >
                                    <p className="text-xs font-semibold text-accent-purple-light">
                                        Phase {phase.phase}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="label">
                                                Start
                                            </label>
                                            <input
                                                type="date"
                                                className="input-base text-xs"
                                                value={phase.startDate}
                                                onChange={(e) =>
                                                    onUpdatePhase(phase.id, {
                                                        startDate:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="label">End</label>
                                            <input
                                                type="date"
                                                className="input-base text-xs"
                                                value={phase.endDate}
                                                onChange={(e) =>
                                                    onUpdatePhase(phase.id, {
                                                        endDate: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="label">
                                            Featured Character(s)
                                        </label>
                                        <input
                                            className="input-base text-xs"
                                            placeholder="e.g. Mavuika"
                                            value={phase.featuredCharacters.join(
                                                ", ",
                                            )}
                                            onChange={(e) =>
                                                onUpdatePhase(phase.id, {
                                                    featuredCharacters:
                                                        e.target.value
                                                            .split(",")
                                                            .map((s) =>
                                                                s.trim(),
                                                            ),
                                                })
                                            }
                                        />
                                    </div>
                                    {phase.notes !== undefined && (
                                        <div className="flex flex-col gap-1">
                                            <label className="label">
                                                Notes
                                            </label>
                                            <input
                                                className="input-base text-xs"
                                                value={phase.notes ?? ""}
                                                onChange={(e) =>
                                                    onUpdatePhase(phase.id, {
                                                        notes: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Events */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="label">Events / Rewards</p>
                            <button
                                className="btn-ghost text-xs px-2 py-1"
                                onClick={onAddEvent}
                            >
                                + Add Event
                            </button>
                        </div>
                        {patch.events.length === 0 && (
                            <p className="text-xs text-slate-600">
                                No events added yet.
                            </p>
                        )}
                        <div className="flex flex-col gap-2">
                            {patch.events.map((ev) => (
                                <div
                                    key={ev.id}
                                    className={clsx(
                                        "bg-navy-800/60 rounded-lg p-3 flex items-center gap-3 border",
                                        ev.enabled
                                            ? "border-slate-700/40"
                                            : "border-slate-800/40 opacity-50",
                                    )}
                                >
                                    <button
                                        onClick={() => onToggleEvent(ev.id)}
                                        className={clsx(
                                            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                                            ev.enabled
                                                ? "bg-accent-purple border-accent-purple text-white"
                                                : "border-slate-600",
                                        )}
                                    >
                                        {ev.enabled && (
                                            <span className="text-xs">✓</span>
                                        )}
                                    </button>
                                    <input
                                        className="input-base text-xs flex-1"
                                        value={ev.name}
                                        placeholder="Event name"
                                        onChange={(e) =>
                                            onUpdateEvent(ev.id, {
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Phase switch */}
                                        <div
                                            className="flex rounded overflow-hidden border border-slate-700/60"
                                            style={{ fontSize: "0.7rem" }}
                                        >
                                            {([1, 2] as const).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() =>
                                                        onUpdateEvent(ev.id, {
                                                            phase: p,
                                                        })
                                                    }
                                                    style={{
                                                        padding:
                                                            "0.2rem 0.5rem",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        border: "none",
                                                        backgroundColor:
                                                            (ev.phase ?? 1) ===
                                                            p
                                                                ? "#7c3aed"
                                                                : "transparent",
                                                        color:
                                                            (ev.phase ?? 1) ===
                                                            p
                                                                ? "#e9d5ff"
                                                                : "#64748b",
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    P{p}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                className="input-base text-xs w-16"
                                                value={ev.primogems}
                                                min={0}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    onUpdateEvent(ev.id, {
                                                        primogems:
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                    })
                                                }
                                            />
                                            <span className="text-xs text-slate-500 shrink-0">
                                                primos
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                className="input-base text-xs w-12"
                                                value={ev.fates ?? 0}
                                                min={0}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    onUpdateEvent(ev.id, {
                                                        fates:
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                    })
                                                }
                                            />
                                            <span
                                                className="text-xs shrink-0"
                                                style={{ color: "#f0d060" }}
                                            >
                                                fates
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onDeleteEvent(ev.id)}
                                        className="btn-danger px-2 py-1 text-xs flex-shrink-0"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advanced breakdown */}
                    <div className="border-t border-slate-700/30 pt-3">
                        <button
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                        >
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "1rem",
                                    height: "1rem",
                                    borderRadius: 3,
                                    border: "1px solid rgba(71,85,105,0.5)",
                                    fontSize: "0.6rem",
                                    transform: showAdvanced
                                        ? "rotate(90deg)"
                                        : "none",
                                    transition: "transform 0.15s",
                                }}
                            >
                                ▶
                            </span>
                            Advanced — Patch Income Estimate
                            <span style={{ color: "#6366f1", fontWeight: 600 }}>
                                ~{estimatedWishes} wishes
                            </span>
                        </button>

                        {showAdvanced && (
                            <div
                                className="mt-3 rounded-lg border border-slate-700/30 overflow-hidden"
                                style={{ fontSize: "0.75rem" }}
                            >
                                {/* Configured */}
                                <div
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        background: "rgba(15,23,42,0.6)",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "#64748b",
                                            fontWeight: 600,
                                            marginBottom: "0.4rem",
                                            textTransform: "uppercase",
                                            fontSize: "0.65rem",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        Configured
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        {maintenancePrimos > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">
                                                    Patch Maintenance
                                                </span>
                                                <span className="text-slate-300">
                                                    {maintenancePrimos.toLocaleString()}{" "}
                                                    ✦
                                                </span>
                                            </div>
                                        )}
                                        {livestreamPrimos > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">
                                                    Livestream Codes
                                                </span>
                                                <span className="text-slate-300">
                                                    {livestreamPrimos.toLocaleString()}{" "}
                                                    ✦
                                                </span>
                                            </div>
                                        )}
                                        {patch.events
                                            .filter((e) => e.enabled)
                                            .map((ev) => (
                                                <div
                                                    key={ev.id}
                                                    className="flex justify-between"
                                                >
                                                    <span className="text-slate-400">
                                                        {ev.name}
                                                    </span>
                                                    <div className="flex gap-3">
                                                        {ev.primogems > 0 && (
                                                            <span className="text-slate-300">
                                                                {ev.primogems.toLocaleString()}{" "}
                                                                ✦
                                                            </span>
                                                        )}
                                                        {(ev.fates ?? 0) >
                                                            0 && (
                                                            <span
                                                                style={{
                                                                    color: "#f0d060",
                                                                }}
                                                            >
                                                                {ev.fates} fates
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        {maintenancePrimos === 0 &&
                                            livestreamPrimos === 0 &&
                                            totalEvents === 0 && (
                                                <span className="text-slate-600">
                                                    None enabled
                                                </span>
                                            )}
                                    </div>
                                </div>

                                {/* Fixed income — exact from patch dates */}
                                <div
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        background: "rgba(15,23,42,0.3)",
                                        borderTop:
                                            "1px solid rgba(51,65,85,0.4)",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "#64748b",
                                            fontWeight: 600,
                                            marginBottom: "0.4rem",
                                            textTransform: "uppercase",
                                            fontSize: "0.65rem",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        Fixed Income
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Daily Commissions ({patchDays}d)
                                            </span>
                                            <span className="text-slate-300">
                                                {commissionPrimos.toLocaleString()}{" "}
                                                ✦
                                            </span>
                                        </div>
                                        {welkinDays > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">
                                                    Welkin Moon ({welkinDays}d)
                                                </span>
                                                <span className="text-slate-300">
                                                    {welkinPrimos.toLocaleString()}{" "}
                                                    ✦
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Spiral Abyss ({abyssResets}×,
                                                resets on 16th)
                                            </span>
                                            <span className="text-slate-300">
                                                {abysspPrimos.toLocaleString()}{" "}
                                                ✦
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Imaginarium Theatre (
                                                {theatreResets}×, resets on 1st)
                                            </span>
                                            <span className="text-slate-300">
                                                {theatrePrimos.toLocaleString()}{" "}
                                                ✦
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Stygian Onslaught (1×, day 7)
                                            </span>
                                            <span className="text-slate-300">
                                                {stygianPrimos.toLocaleString()}{" "}
                                                ✦
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Character Trials (2 phases)
                                            </span>
                                            <span className="text-slate-300">
                                                {trialPrimos} ✦
                                            </span>
                                        </div>
                                        {shopFates > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">
                                                    Monthly Shop (
                                                    {theatreResets}×, resets on
                                                    1st)
                                                </span>
                                                <span
                                                    style={{ color: "#f0d060" }}
                                                >
                                                    {shopFates} fates
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Total */}
                                <div
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        background: "rgba(99,102,241,0.08)",
                                        borderTop:
                                            "1px solid rgba(51,65,85,0.4)",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            color: "#e2e8f0",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Estimated Total
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400">
                                            {grandTotalPrimos.toLocaleString()}{" "}
                                            ✦
                                        </span>
                                        <span
                                            style={{
                                                color: "#a78bfa",
                                                fontWeight: 700,
                                            }}
                                        >
                                            ~{estimatedWishes} wishes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
