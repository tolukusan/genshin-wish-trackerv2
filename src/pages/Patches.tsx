import { useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { InfoTip } from "@/components/ui/InfoTip";
import { format, parseISO, startOfDay } from "date-fns";
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

export function Patches() {
    const [showMissingForm, setShowMissingForm] = useState(false);
    const [missingVersion, setMissingVersion] = useState("");
    const [missingStartDate, setMissingStartDate] = useState("");
    const [missingError, setMissingError] = useState("");
    const {
        patches,
        addPatch,
        addPatchAt,
        deletePatch,
        setPatchType,
        togglePatchModifier,
    } = usePlannerStore();
    const [showPast, setShowPast] = useState(false);
    // Finished patches can't change the plan, so they start hidden.
    const today = startOfDay(new Date());
    const past = patches.filter((p) => parseISO(p.endDate) <= today);
    const shown = showPast ? patches : patches.filter((p) => parseISO(p.endDate) > today);

    return (
        <div className="max-w-4xl flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Patch guesses
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Choose the base content level, then add any special reward bonuses that overlap.
                        Estimates and bonus values live in Settings.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Future patch content is not announced ahead of time, so every patch starts as Standard.
                        Mark the ones you expect to add an area or bonus; it is your best guess until the patch is announced.
                        <InfoTip topic="patch-types" />
                    </p>
                </div>
                <div className="flex flex-wrap sm:justify-end gap-2 shrink-0">
                    <button className="btn-secondary" onClick={() => setShowMissingForm((shown) => !shown)}>
                        + Add Missing Patch
                    </button>
                    <button className="btn-primary" onClick={addPatch}>
                        + Add Next Patch
                    </button>
                </div>
            </div>

            {showMissingForm && (
                <section className="card p-4 flex flex-col gap-3">
                    <div>
                        <div className="text-sm font-semibold text-slate-900">Add a patch anywhere</div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Enter the real version and start date. Phase and end dates use your configured patch lengths.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <label className="flex flex-col gap-1">
                            <span className="label">Version</span>
                            <input
                                className="input-base"
                                value={missingVersion}
                                placeholder="e.g. 9.2"
                                onChange={(event) => setMissingVersion(event.target.value)}
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="label">Start date</span>
                            <input
                                type="date"
                                className="input-base"
                                value={missingStartDate}
                                onChange={(event) => setMissingStartDate(event.target.value)}
                            />
                        </label>
                        <button
                            className="btn-primary"
                            onClick={() => {
                                const error = addPatchAt(missingVersion, missingStartDate);
                                setMissingError(error ?? "");
                                if (!error) {
                                    setMissingVersion("");
                                    setMissingStartDate("");
                                    setShowMissingForm(false);
                                }
                            }}
                        >
                            Add Patch
                        </button>
                    </div>
                    {missingError && <p className="text-xs text-red-600">{missingError}</p>}
                </section>
            )}

            {past.length > 0 && (
                <button
                    type="button"
                    className="btn-ghost self-start"
                    aria-expanded={showPast}
                    onClick={() => setShowPast((v) => !v)}
                >
                    {showPast ? "Hide" : "Show"} {past.length} past patch{past.length === 1 ? "" : "es"}
                </button>
            )}

            {/* A list rather than a table so it fits a phone without sideways scrolling. */}
            <ul className="card flex flex-col" aria-label="Patches">
                {shown.map((patch) => (
                    <li
                        key={patch.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200/50 p-3 last:border-0"
                    >
                        <div className="flex min-w-[10rem] flex-1 items-baseline gap-3">
                            <span className="font-semibold text-accent-purple">v{patch.version}</span>
                            <span className="whitespace-nowrap text-sm text-slate-700">
                                {format(parseISO(patch.startDate), "MMM d")} – {format(parseISO(patch.endDate), "MMM d, yyyy")}
                            </span>
                        </div>
                        <label className="flex items-center gap-2">
                            <span className="sr-only">Base content for v{patch.version}</span>
                            <select
                                className="input-base min-w-32 text-xs"
                                value={patch.patchType}
                                onChange={(e) => setPatchType(patch.id, e.target.value as PatchType)}
                            >
                                {(Object.keys(PATCH_TYPE_LABELS) as PatchType[]).map((t) => (
                                    <option key={t} value={t}>
                                        {PATCH_TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(PATCH_MODIFIER_LABELS) as PatchModifier[]).map((modifier) => {
                                const checked = (patch.modifiers ?? []).includes(modifier);
                                return (
                                    <label
                                        key={modifier}
                                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                                            checked
                                                ? "border-violet-300 bg-violet-50 text-violet-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="accent-[var(--color-accent)]"
                                            checked={checked}
                                            onChange={() => togglePatchModifier(patch.id, modifier)}
                                        />
                                        {PATCH_MODIFIER_LABELS[modifier]}
                                    </label>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => {
                                // Deleting removes the patch from projections and any plans using it.
                                if (window.confirm(`Delete v${patch.version}? This cannot be undone.`)) deletePatch(patch.id)
                            }}
                            aria-label={`Delete patch v${patch.version}`}
                            className="btn-danger ml-auto min-h-0 px-2 py-1 text-xs"
                        >
                            Delete
                        </button>
                    </li>
                ))}
                {shown.length === 0 && (
                    <li className="p-8 text-center text-sm text-slate-500">
                        {patches.length === 0 ? "No patches yet. Add one to get started." : "No upcoming patches. Add the next one above."}
                    </li>
                )}
            </ul>
        </div>
    );
}
