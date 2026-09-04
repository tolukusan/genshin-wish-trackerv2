import { useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { format, parseISO } from "date-fns";
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

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Patches
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Choose the base content level, then add any special reward bonuses that overlap.
                        Estimates and bonus values live in Settings.
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
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

            <div className="card overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-300/50 text-left">
                            <th className="p-3 text-xs font-medium text-slate-500">Version</th>
                            <th className="p-3 text-xs font-medium text-slate-500">Window</th>
                            <th className="p-3 text-xs font-medium text-slate-500">Base Content</th>
                            <th className="p-3 text-xs font-medium text-slate-500">Special Bonuses</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {patches.map((patch) => (
                            <tr key={patch.id} className="border-b border-slate-200/50 last:border-0 align-top">
                                <td className="p-3 text-accent-purple font-semibold">
                                    v{patch.version}
                                </td>
                                <td className="p-3 text-slate-700 whitespace-nowrap">
                                    {format(parseISO(patch.startDate), "MMM d")} –{" "}
                                    {format(parseISO(patch.endDate), "MMM d, yyyy")}
                                </td>
                                <td className="p-3">
                                    <select
                                        className="input-base text-xs min-w-32"
                                        value={patch.patchType}
                                        onChange={(e) =>
                                            setPatchType(patch.id, e.target.value as PatchType)
                                        }
                                    >
                                        {(Object.keys(PATCH_TYPE_LABELS) as PatchType[]).map((t) => (
                                            <option key={t} value={t}>
                                                {PATCH_TYPE_LABELS[t]}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.keys(PATCH_MODIFIER_LABELS) as PatchModifier[]).map((modifier) => {
                                            const checked = (patch.modifiers ?? []).includes(modifier);
                                            return (
                                                <label
                                                    key={modifier}
                                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                                                        checked
                                                            ? "border-violet-300 bg-violet-50 text-violet-700"
                                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="accent-violet-600"
                                                        checked={checked}
                                                        onChange={() => togglePatchModifier(patch.id, modifier)}
                                                    />
                                                    {PATCH_MODIFIER_LABELS[modifier]}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => deletePatch(patch.id)}
                                        className="btn-danger px-2 py-1 text-xs"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {patches.length === 0 && (
                    <div className="p-8 text-center">
                        <p className="text-slate-500 text-sm">
                            No patches yet. Add one to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
