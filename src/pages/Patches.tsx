import { usePlannerStore } from "@/store/usePlannerStore";
import { format, parseISO } from "date-fns";
import type { PatchType } from "@/types";

const PATCH_TYPE_LABELS: Record<PatchType, string> = {
    standard: "Standard",
    "sub-area": "Sub-area",
    "lantern-rite": "Lantern Rite",
    "new-region": "New Region",
};

export function Patches() {
    const { patches, addPatch, deletePatch, setPatchType } = usePlannerStore();

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">
                        Patches
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Dates are auto-scheduled from the anchor in Settings. Pick each patch's
                        type here — reward estimates and labels live in Settings.
                    </p>
                </div>
                <button className="btn-primary" onClick={addPatch}>
                    + Add Patch
                </button>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50 text-left">
                            <th className="p-3 text-xs font-medium text-slate-500">Version</th>
                            <th className="p-3 text-xs font-medium text-slate-500">Window</th>
                            <th className="p-3 text-xs font-medium text-slate-500">Patch Type</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {patches.map((patch) => (
                            <tr key={patch.id} className="border-b border-slate-800/50 last:border-0">
                                <td className="p-3 text-accent-purple font-semibold">
                                    v{patch.version}
                                </td>
                                <td className="p-3 text-slate-300">
                                    {format(parseISO(patch.startDate), "MMM d")} –{" "}
                                    {format(parseISO(patch.endDate), "MMM d, yyyy")}
                                </td>
                                <td className="p-3">
                                    <select
                                        className="input-base text-xs"
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
