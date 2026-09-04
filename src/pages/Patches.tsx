import { usePlannerStore } from "@/store/usePlannerStore";
import { addDays, format, parseISO } from "date-fns";
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
    const {
        patches,
        config,
        addPatch,
        insertPatchBefore,
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
                <button className="btn-primary" onClick={addPatch}>
                    + Add Patch
                </button>
            </div>

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
                        {patches.map((patch, index) => {
                            const [major, minor] = patch.version.split(".").map(Number);
                            const priorVersion = minor === 0 ? `${major - 1}.7` : `${major}.${minor - 1}`;
                            const canInsertBefore = Number.isInteger(major)
                                && Number.isInteger(minor)
                                && !patches.some((candidate) => candidate.version === priorVersion)
                                && (!patches[index - 1]
                                    || parseISO(patches[index - 1].endDate) <= addDays(
                                        parseISO(patch.startDate),
                                        -config.recurring.patchLengthDays,
                                    ));
                            return (
                            <tr key={patch.id} className="border-b border-slate-200/50 last:border-0 align-top">
                                <td className="p-3 text-accent-purple font-semibold">
                                    <div>v{patch.version}</div>
                                    {canInsertBefore && (
                                        <button
                                            onClick={() => insertPatchBefore(patch.id)}
                                            className="mt-1 text-[0.7rem] font-medium text-violet-600 hover:text-violet-800"
                                            title={`Restore v${priorVersion} immediately before this patch`}
                                        >
                                            + Insert v{priorVersion} before
                                        </button>
                                    )}
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
                            );
                        })}
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
