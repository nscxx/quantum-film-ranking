import type { CelebrationEvent, DisplayEvent } from './types';

export const CHAMPION_CLIP_MS = 8000;
export const CHAMPION_LOOPS = 2;
export const CHAMPION_HOLD_MS = 4000;
export const CHAMPION_DURATION_MS = CHAMPION_CLIP_MS * CHAMPION_LOOPS + CHAMPION_HOLD_MS;
export const CHAMPION_PLAY_RATIO = (CHAMPION_CLIP_MS * CHAMPION_LOOPS) / CHAMPION_DURATION_MS;
export const MILESTONE_DURATION_MS = 8000;

const CELEBRATION_DURATIONS = {
  score: 2000,
  milestone: MILESTONE_DURATION_MS,
  top3: 5000,
  champion: CHAMPION_DURATION_MS,
  bigCustomer: 8000,
} as const;

export function expandDisplayEvent(event: DisplayEvent): CelebrationEvent[] {
  if (event.eventKind === 'bigCustomer') return [{
    ...event,
    celebrationId: `${event.id}:bigCustomer`,
    type: 'bigCustomer',
    durationMs: CELEBRATION_DURATIONS.bigCustomer,
  }];
  const celebrations: CelebrationEvent[] = [{
    ...event,
    celebrationId: `${event.id}:score`,
    type: 'score',
    durationMs: CELEBRATION_DURATIONS.score,
  }];
  if (event.milestone) celebrations.push({
    ...event,
    celebrationId: `${event.id}:milestone`,
    type: 'milestone',
    durationMs: CELEBRATION_DURATIONS.milestone,
  });
  if (event.rankBefore > 3 && event.rankAfter <= 3) celebrations.push({
    ...event,
    celebrationId: `${event.id}:top3`,
    type: 'top3',
    durationMs: CELEBRATION_DURATIONS.top3,
  });
  if (event.rankBefore !== 1 && event.rankAfter === 1) celebrations.push({
    ...event,
    celebrationId: `${event.id}:champion`,
    type: 'champion',
    durationMs: CELEBRATION_DURATIONS.champion,
  });
  return celebrations;
}
