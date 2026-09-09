'use client';

import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { CelebrationEvent } from '@/lib/order-race/types';
import styles from './big-customer-celebration.module.css';

export function BigCustomerCelebration({ event }: { event: Pick<CelebrationEvent, 'durationMs'> }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;
    void import('lottie-web').then(({ default: lottie }) => {
      if (disposed || !container.current) return;
      animation = lottie.loadAnimation({ container: container.current, renderer: 'svg', loop: false,
        autoplay: true, path: '/lottie/big-customer.json', rendererSettings: { preserveAspectRatio: 'xMidYMid slice' } });
      animation.setSpeed(8000 / event.durationMs);
    }).catch(() => undefined);
    return () => { disposed = true; animation?.destroy(); };
  }, [event.durationMs]);
  return (
    <section className={styles.stage} style={{ animationDuration: `${event.durationMs}ms` }} aria-label="杭州保通科技实业有限公司大客户订单荣耀达成">
      <div ref={container} className={styles.animation} aria-hidden="true" />
      <div className={styles.copy}>
        <small>重磅喜报</small>
        <h2>杭州保通科技实业有限公司</h2>
        <strong><span>天穹漆面膜 3000 卷</span></strong>
        <p><i />感谢信任&nbsp;&nbsp;携手共赢<i /></p>
      </div>
    </section>
  );
}
