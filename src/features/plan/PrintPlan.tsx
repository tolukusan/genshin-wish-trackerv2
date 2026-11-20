import { format, parseISO } from 'date-fns'
import { formatChance } from '@/engine/probability'
import type { ChainStopResult } from '@/types'
import { bannerName, bannerTypeLabel, VERDICT_LABEL, verdictFor } from './planModel'

interface PrintPlanProps {
  results: ChainStopResult[]
  wallet: number
  characterPity: number
  today: Date
}

/**
 * The plan as printed: a plain summary table, black on white. The interactive
 * river and chart don't survive paper (narrow pages fall back to the phone
 * layout, and the dark fills waste ink), so they are hidden when printing.
 */
export function PrintPlan({ results, wallet, characterPity, today }: PrintPlanProps) {
  const cell = 'border-b border-[#ccc] px-2 py-1.5 text-left align-top'
  return (
    <div className="print-only print-plan">
      <p className="text-[11px]">Teyvat Pull Planner · generated {format(today, 'MMM d, yyyy')}</p>
      <h1 className="mt-1 text-2xl">Plan</h1>
      <p className="mt-1 text-sm">
        Wallet today: <b>{wallet}</b> pulls · character pity {characterPity}
      </p>

      {results.length === 0 ? (
        <p className="mt-6 text-sm">No banners planned yet.</p>
      ) : (
        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr>
              {['Banner', 'Kind', 'Pulls by end', 'Worst case', 'Chance', 'Outlook', 'Spend', 'Carry forward'].map((h) => (
                <th key={h} className={`${cell} font-semibold`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.stop.id}>
                <td className={cell}>
                  v{r.patchVersion} Phase {r.stop.phase}
                  <br />
                  {format(parseISO(r.phaseDate), 'MMM d')}–{format(parseISO(r.phaseEndDate), 'MMM d, yyyy')}
                  {bannerName(r) ? <><br />{bannerName(r)}</> : null}
                </td>
                <td className={cell}>{bannerTypeLabel(r.bannerType, r.copies)}</td>
                <td className={cell}>{r.availableAtEnd}</td>
                <td className={cell}>{r.pullsForGuarantee}</td>
                <td className={`${cell} font-semibold`}>{formatChance(r.successChance)}</td>
                <td className={cell}>{VERDICT_LABEL[verdictFor(r)]}</td>
                <td className={cell}>{r.actualSpend}</td>
                <td className={cell}>{r.remainingAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-[11px]">
        Estimates based on your patch guesses. Banners are planned in date order; pity and leftover pulls carry into the next one.
        “Chance” assumes every pull available by the banner’s end goes into it; “worst case” is the pulls that guarantee it.
      </p>
    </div>
  )
}
