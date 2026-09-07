import { CHAMPION_CLIP_MS, CHAMPION_LOOPS } from './celebrations';
import type { CelebrationType } from './types';

export type CelebrationSoundOptions = {
  loops?: number;
  everyMs?: number;
};

export const AUDIO_TRACKS = {
  bgm: '/audio/order-race-bgm.mp3',
  score: '/audio/score-injection.mp3',
  milestone: '/audio/milestone.mp3',
  top3: '/audio/top-three.mp3',
  champion: '/audio/champion.mp3',
} as const;

const BGM_VOLUME = 0.32;
const BGM_DUCKED = 0.1;
const SFX_VOLUME = 0.82;

function makeAudio(src: string, loop = false) {
  const el = new Audio(src);
  el.preload = 'auto';
  el.loop = loop;
  return el;
}

export type ScreenAudio = {
  start: () => Promise<boolean>;
  setMuted: (muted: boolean) => void;
  playCelebration: (type: CelebrationType, options?: CelebrationSoundOptions) => void;
  restoreBgm: () => void;
  dispose: () => void;
};

export function createScreenAudio(): ScreenAudio {
  const bgm = makeAudio(AUDIO_TRACKS.bgm, true);
  const sfx: Record<CelebrationType, HTMLAudioElement> = {
    score: makeAudio(AUDIO_TRACKS.score),
    milestone: makeAudio(AUDIO_TRACKS.milestone),
    top3: makeAudio(AUDIO_TRACKS.top3),
    champion: makeAudio(AUDIO_TRACKS.champion),
  };
  let muted = false;
  let ducked = false;
  let disposed = false;
  let loopIndex = 0;
  let loopTotal = 1;
  let replayTimers: number[] = [];

  function sfxVolume() {
    return muted ? 0 : SFX_VOLUME;
  }

  function targetBgmVolume() {
    if (muted) return 0;
    return ducked ? BGM_DUCKED : BGM_VOLUME;
  }

  function applyVolumes() {
    bgm.volume = targetBgmVolume();
    const volume = sfxVolume();
    (Object.values(sfx) as HTMLAudioElement[]).forEach((el) => {
      el.volume = volume;
    });
  }

  function clearReplay() {
    replayTimers.forEach((timer) => window.clearTimeout(timer));
    replayTimers = [];
  }

  function playClip(el: HTMLAudioElement) {
    try { el.currentTime = 0; } catch { /* not seekable yet */ }
    void el.play().catch(() => undefined);
  }

  function stopSfx() {
    clearReplay();
    loopIndex = 0;
    loopTotal = 1;
    (Object.values(sfx) as HTMLAudioElement[]).forEach((el) => {
      el.pause();
      try { el.currentTime = 0; } catch { /* not seekable yet */ }
    });
  }

  function anySfxPlaying() {
    return (Object.values(sfx) as HTMLAudioElement[]).some((el) => !el.paused && !el.ended);
  }

  (Object.values(sfx) as HTMLAudioElement[]).forEach((el) => {
    el.addEventListener('ended', () => {
      if (disposed || anySfxPlaying() || loopIndex < loopTotal - 1) return;
      ducked = false;
      applyVolumes();
    });
  });

  return {
    async start() {
      applyVolumes();
      try {
        await bgm.play();
        applyVolumes();
        return true;
      } catch {
        return false;
      }
    },
    setMuted(next) {
      muted = next;
      applyVolumes();
      if (!muted && bgm.paused) void bgm.play().catch(() => undefined);
    },
    playCelebration(type, options) {
      stopSfx();
      const loops = Math.max(1, options?.loops ?? (type === 'champion' ? CHAMPION_LOOPS : 1));
      const everyMs = options?.everyMs ?? (type === 'champion' ? CHAMPION_CLIP_MS : 0);
      loopTotal = loops;
      loopIndex = 0;
      ducked = true;
      applyVolumes();
      const el = sfx[type];
      playClip(el);
      if (loops > 1 && everyMs > 0) {
        for (let index = 1; index < loops; index += 1) {
          replayTimers.push(window.setTimeout(() => {
            if (disposed) return;
            loopIndex = index;
            playClip(el);
          }, index * everyMs));
        }
      }
    },
    restoreBgm() {
      if (anySfxPlaying()) return;
      ducked = false;
      applyVolumes();
    },
    dispose() {
      disposed = true;
      stopSfx();
      bgm.pause();
      bgm.removeAttribute('src');
      bgm.load();
      (Object.values(sfx) as HTMLAudioElement[]).forEach((el) => {
        el.removeAttribute('src');
        el.load();
      });
    },
  };
}
