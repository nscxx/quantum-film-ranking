'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { CelebrationEvent } from '@/lib/order-race/types';
import styles from './top3-celebration.module.css';

const SCENE_MS = 5000;
type TopThreeEvent = Pick<CelebrationEvent, 'durationMs' | 'provinceName' | 'rankAfter'>;
type PlayerModule = typeof import('lottie-web/build/player/lottie_light');
let warmup: Promise<{ player: PlayerModule['default']; data: object }> | undefined;

/** Start while the sound gate is shown, before a celebration enters the queue. */
export function preloadTopThree() {
  if (!warmup) {
    const image = (src: string) => new Promise<void>((resolve, reject) => {
      const asset = new Image();
      asset.onload = () => resolve();
      asset.onerror = () => reject(new Error('Top-three image failed to load'));
      asset.src = src;
    });
    warmup = Promise.all([
      import('lottie-web/build/player/lottie_light'),
      fetch('/lottie/top3/top3.json').then(response => {
        if (!response.ok) throw new Error('Top-three animation failed to load');
        return response.json() as Promise<object>;
      }),
      image('/lottie/top3/track.png'), image('/lottie/top3/car.png'),
    ]).then(([module, data]) => ({ player: module.default, data }))
      .catch(error => { warmup = undefined; throw error; });
  }
  return warmup;
}

export function TopThreeCelebration({ event, hold = false, seek, onProgress }: {
  event: TopThreeEvent;
  /** Preview keeps the final hero pose instead of fading into the next event. */
  hold?: boolean;
  /** Optional normalized seek position for the preview scrubber. */
  seek?: number;
  onProgress?: (progress: number) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const seekRef = useRef(seek);
  const progressRef = useRef(onProgress);
  const [failed, setFailed] = useState(false);
  useEffect(() => { seekRef.current = seek; }, [seek]);
  useEffect(() => { progressRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;
    let raf = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion: Animation[] = [];
    let start = 0;
    let lastReported = -1;
    const apply = (progress: number) => {
      const time = Math.min(4999, Math.max(0, progress * SCENE_MS));
      animation?.goToAndStop(time * .06, true);
      motion.forEach(item => { item.currentTime = time; });
      const rounded = Math.round(progress * 100);
      if (rounded !== lastReported) {
        lastReported = rounded;
        progressRef.current?.(progress);
      }
    };
    const tick = (now: number) => {
      if (disposed) return;
      const explicit = seekRef.current;
      let progress = explicit ?? Math.min(1, (now - start) / Math.max(1, event.durationMs));
      if (reducedMotion.matches && explicit === undefined) progress = .76;
      if (hold && explicit === undefined) progress = Math.min(.88, progress);
      apply(progress);
      // Preview seeking remains responsive after playback reaches the end.
      if (hold || (!reducedMotion.matches && progress < 1)) raf = requestAnimationFrame(tick);
    };
    void preloadTopThree().then(({ player, data }) => {
      if (disposed || !canvas.current || !root.current) return;
      animation = player.loadAnimation({
        container: canvas.current, renderer: 'svg', loop: false, autoplay: false,
        animationData: structuredClone(data), assetsPath: '/lottie/top3/',
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
      });
      animation.addEventListener('DOMLoaded', () => {
        if (disposed || !root.current) return;
        root.current.dataset.ready = 'true';
        motion.push(...root.current.getAnimations({ subtree: true }));
        motion.forEach(item => item.pause());
        start = performance.now();
        apply(reducedMotion.matches ? .76 : (seekRef.current ?? 0));
        raf = requestAnimationFrame(tick);
      });
      animation.addEventListener('data_failed', () => {
        if (!disposed) setFailed(true);
      });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      animation?.destroy();
    };
  }, [event.durationMs, hold]);

  const title = '恭喜' + event.provinceName;
  return (
    <section ref={root} className={styles.stage} data-failed={failed || undefined}
      aria-label={title + '，积分进入全国前三，当前第' + event.rankAfter + '名'}>
      <div className={styles.frame}>
        <div className={styles.scene}>
          <div ref={canvas} className={styles.animation} aria-hidden="true" />
          <div className={styles.lightBloom} aria-hidden="true" />
          <div className={styles.brand} aria-label="圣戈班">
            {/* The project already includes this official brand reference. */}
            {/* oxlint-disable-next-line next/no-img-element -- local brand artwork */}
            <img src="/screen-assets/logo-saint-gobain-reference.png" alt="SAINT-GOBAIN 圣戈班" />
          </div>
          <div className={styles.brandMotto}><span>驾 驭 光 的 力 量</span><small>DRIVING A BRIGHTER WORLD</small></div>
          <div className={styles.heading}>
            <h2 className={styles.title} data-text={title} style={{ fontSize: event.provinceName.length > 5 ? '5.15cqw' : event.provinceName.length > 3 ? '5.9cqw' : undefined }}>
              <span>{title}</span>
            </h2>
            <div className={styles.titleSweep} aria-hidden="true" />
          </div>
          <p className={styles.subtitle}>积分进入前三！</p>
          <p className={styles.motto}>同心同行&nbsp; 驶向更大可能</p>
          <span className={styles.topLabel} aria-hidden="true">TOP</span>
          <p className={styles.leftFlagCopy}>FASTER<br />HIGHER<br />TOGETHER</p>
          <p className={styles.rightFlagCopy}>每一份努力<br />都在驱动<br />更远的未来</p>
          <span className={styles.floorLabel} aria-hidden="true">TOP 3</span>
          {failed && <div className={styles.fallbackCar} aria-hidden="true" />}
          <div className={styles.vignette} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
