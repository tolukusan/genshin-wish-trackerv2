import { useState } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { GAME_RULES } from '@/engine/gameRules'
import { bannerOdds, chanceCurve, formatChance } from '@/engine/probability'
import { NumberInput } from '@/components/ui/NumberInput'
import { Toggle } from '@/components/ui/Toggle'
import { LineChart, type ChartMarker } from './LineChart'
import { VIZ } from './vizTheme'

// "Try it": chance of getting the featured character vs pulls, from a given
// pity state, with the typical result, your pulls and the worst case marked.
export function ChanceExplorer({ compact = false }: { compact?: boolean }) {
  const { player, config } = usePlannerStore()
  const currentPulls = Math.floor((player.primogems + player.genesisCrystals) / GAME_RULES.primogemsPerFate)
    + player.intertwinedFates + Math.floor(player.starglitter / GAME_RULES.starglitterPerFate)

  // Prefilled from Data Entry; editing here does not change saved data.
  const [pity, setPity] = useState(compact ? 0 : player.characterBannerPity)
  const [guaranteed, setGuaranteed] = useState(compact ? false : player.characterBannerGuaranteed)
  const [pulls, setPulls] = useState(compact ? 0 : currentPulls)
  const [copies, setCopies] = useState(1)

  const hard = GAME_RULES.hardPity.character
  const worstCase = (hard - pity) + (guaranteed ? 0 : hard) + (copies - 1) * 2 * hard
  const curve = chanceCurve(bannerOdds(config, 'character'), { pity, guaranteed }, worstCase, copies)
  const typical = curve.findIndex((p) => p >= 0.5)
  const chance = pulls >= worstCase ? 1 : curve[Math.max(0, pulls)]
  const copyWord = copies > 1 ? `${copies} copies` : 'the character'

  const markers: ChartMarker[] = [
    { x: typical, label: `Typical: ${typical}`, tone: 'neutral' },
    { x: worstCase, label: `Worst case: ${worstCase}`, tone: 'good' },
  ]
  if (!compact && pulls > 0 && pulls < worstCase) markers.push({ x: pulls, label: `You: ${formatChance(chance)}`, tone: 'accent' })

  const step = worstCase <= 100 ? 25 : worstCase <= 200 ? 50 : 100
  const xTicks = Array.from({ length: Math.floor(worstCase / step) + 1 }, (_, i) => i * step)

  const chart = (
    <LineChart
      values={curve}
      yMax={1}
      formatY={(y) => formatChance(y)}
      formatX={(x) => `${x} pulls`}
      xTicks={xTicks}
      yTicks={[0, 0.5, 1]}
      markers={markers}
      summary={`Chance of getting ${copyWord} rises with pulls: 50% by about ${typical} pulls and certain at ${worstCase} pulls (worst case).`}
      height={compact ? 110 : 210}
      compact={compact}
    />
  )
  if (compact) return chart

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
        <NumberInput label="Pity now" value={pity} onChange={setPity} max={hard - 1} />
        <NumberInput label="Pulls you'll have" value={pulls} onChange={setPulls} max={2000} />
        <NumberInput label="Copies wanted" value={copies} onChange={setCopies} min={1} max={7} />
        <div className="pt-5">
          <Toggle label="Guaranteed" checked={guaranteed} onChange={setGuaranteed} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">Chance with {pulls} pulls</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatChance(chance)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">Pulls that guarantee {copyWord}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{worstCase}</p>
        </div>
      </div>

      {chart}

      <p className="text-xs text-slate-600">
        Half of players get {copyWord} by about <b style={{ color: VIZ.textPrimary }}>{typical}</b> pulls; the worst case
        (every 5★ at pull {hard}{guaranteed ? '' : ' and a lost 50/50'}) needs <b style={{ color: VIZ.textPrimary }}>{worstCase}</b>.
        Uses your {config.fiftyFiftyWinPercent ?? 55}% 50/50 win rate. Prefilled from Data Entry; changes here are not saved.
      </p>
    </div>
  )
}
