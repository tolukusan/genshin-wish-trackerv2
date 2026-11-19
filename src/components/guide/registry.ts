import type { ComponentType } from 'react'
import type { GuideTopicId } from '@/content/guide'
import { ChanceExplorer } from './ChanceExplorer'
import { IncomeVisual, PatchTypesVisual, PityVisual } from './Charts'
import {
  DataVisual, FatePointsVisual, FiftyFiftyVisual, RoadmapVisual, StarglitterVisual, StepsVisual, UnknownsVisual,
} from './Diagrams'

interface TopicVisual {
  Visual: ComponentType<{ compact?: boolean }>
  /** Also shown, in compact form, inside "?" tips. */
  inTips?: boolean
  /** Has controls the reader can play with. */
  interactive?: boolean
}

export const GUIDE_VISUALS: Record<GuideTopicId, TopicVisual> = {
  'getting-started': { Visual: StepsVisual },
  'how-projections-work': { Visual: IncomeVisual },
  unknowns: { Visual: UnknownsVisual },
  'patch-types': { Visual: PatchTypesVisual, inTips: true },
  pity: { Visual: PityVisual, inTips: true, interactive: true },
  'fifty-fifty': { Visual: FiftyFiftyVisual, inTips: true },
  'fate-points': { Visual: FatePointsVisual, inTips: true },
  'guarantee-vs-chance': { Visual: ChanceExplorer, inTips: true, interactive: true },
  roadmap: { Visual: RoadmapVisual },
  starglitter: { Visual: StarglitterVisual },
  'your-data': { Visual: DataVisual },
}
