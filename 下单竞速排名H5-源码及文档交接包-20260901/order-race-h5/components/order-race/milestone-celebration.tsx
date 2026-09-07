'use client';

import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { CelebrationEvent } from '@/lib/order-race/types';
import styles from './milestone-celebration.module.css';

export function MilestoneCelebration({ event }: { event: Pick<CelebrationEvent, 'durationMs' | 'milestone' | 'scoreAfter' | 'provinceName'> }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    void import('lottie-web').then(({ default: lottie }) => {
      if (disposed || !container.current) return;
      animation = lottie.loadAnimation({ container: container.current, renderer: 'svg', loop: false,
        autoplay: false, path: '/lottie/milestone.json', rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      animation.addEventListener('DOMLoaded', () => {
        if (disposed || !animation) return;
        if (reducedMotion.matches) animation.goToAndStop(40, true);
        else { animation.setSpeed(3000 / event.durationMs); animation.play(); }
      });
    }).catch(() => { /* The background and live score remain visible if the player cannot load. */ });
    return () => { disposed = true; animation?.destroy(); };
  }, [event.durationMs]);
  const points = event.milestone ?? event.scoreAfter;
  return (
    <section className={styles.stage} style={{ animationDuration: `${event.durationMs}ms` }} aria-label={`${event.provinceName}积分阶段突破，达成${points}分阶段`}>
      <div className={styles.art}>
        <div ref={container} className={styles.animation} aria-hidden="true" />
        <small className={styles.eyebrow}>SCORE MILESTONE</small>
        <h2 className={styles.title}>积分阶段突破</h2>
        <strong className={styles.province}>{event.provinceName}</strong>
        <div className={styles.score} style={{ fontSize: `${points >= 10000 ? 9 : points >= 1000 ? 10.5 : 12}cqw` }}><b>{points.toLocaleString()}</b><em>分</em></div>
        <p className={styles.detail}>达成 {points.toLocaleString()} 分阶段</p>
      </div>
    </section>
  );
}
