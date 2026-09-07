'use client';

import { useEffect, useRef, useState } from 'react';
import type { CelebrationEvent } from '@/lib/order-race/types';
import { CHAMPION_DURATION_MS, CHAMPION_LOOPS, CHAMPION_PLAY_RATIO } from '@/lib/order-race/celebrations';
import styles from './champion-celebration.module.css';

type ChampionEvent = Pick<CelebrationEvent, 'durationMs' | 'provinceName'>;

const VIDEO_SRC = '/video/champion-dragon.mp4';
const CITY_SRC = '/lottie/champion/city.png';
const VIDEO_SECONDS = 8.042;

type ChampionAssets = { videoUrl: string };

let assetsPromise: Promise<ChampionAssets> | undefined;

export function preloadChampion() {
  if (!assetsPromise) {
    const loadAssets = Promise.all([
      fetch(VIDEO_SRC, { cache: 'force-cache' }).then(async response => {
        if (!response.ok) throw new Error(`Champion video failed to load: ${response.status}`);
        return URL.createObjectURL(await response.blob());
      }),
      new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Champion city failed to load'));
        image.src = CITY_SRC;
      }),
    ]).then(([videoUrl]) => ({ videoUrl }));
    const timeout = new Promise<ChampionAssets>((_, reject) => {
      window.setTimeout(() => reject(new Error('Champion assets timed out')), 15000);
    });
    assetsPromise = Promise.race([loadAssets, timeout]).catch(error => {
      assetsPromise = undefined;
      throw error;
    });
  }
  return assetsPromise;
}

export function ChampionCelebration({ event, hold = false, seek, onProgress, onReady }: {
  event: ChampionEvent; hold?: boolean; seek?: number; onProgress?: (progress: number) => void; onReady?: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSeek = useRef(seek);
  const progressCallback = useRef(onProgress);
  const readyCallback = useRef(onReady);
  const [failed, setFailed] = useState(false);
  useEffect(() => { currentSeek.current = seek; }, [seek]);
  useEffect(() => { progressCallback.current = onProgress; }, [onProgress]);
  useEffect(() => { readyCallback.current = onReady; }, [onReady]);

  useEffect(() => {
    let disposed = false, raf = 0, startedAt = 0, lastReported = -1, lastSeek = -1, ready = false;
    let loadTimer = 0;
    const typography: Animation[] = [];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const video = videoRef.current;
    const clipSeconds = () => {
      const duration = video?.duration;
      return duration && Number.isFinite(duration) && duration > 0 ? duration : VIDEO_SECONDS;
    };
    const apply = (progress: number) => {
      const time = Math.max(0, Math.min(CHAMPION_DURATION_MS - 1, progress * CHAMPION_DURATION_MS));
      typography.forEach(item => { item.currentTime = time; });
      if (video) {
        const duration = clipSeconds();
        const playWindow = event.durationMs * CHAMPION_PLAY_RATIO;
        const elapsed = progress * event.durationMs;
        const holdEnd = hold && currentSeek.current === undefined;
        const atHold = elapsed >= playWindow || progress >= (holdEnd ? 0.92 : 1);
        const local = atHold ? duration * CHAMPION_LOOPS : (elapsed / Math.max(1, playWindow)) * (duration * CHAMPION_LOOPS);
        const target = atHold ? Math.max(0, duration - 0.05) : local % duration;
        const rate = (duration * CHAMPION_LOOPS) / Math.max(0.2, playWindow / 1000);
        if (reduced.matches && currentSeek.current === undefined) {
          video.pause();
          if (Math.abs(video.currentTime - duration * 0.82) > 0.08) video.currentTime = duration * 0.82;
        } else if (currentSeek.current !== undefined || atHold) {
          video.pause();
          if (Math.abs(video.currentTime - target) > 0.04 && Math.abs(target - lastSeek) > 0.03) {
            video.currentTime = target;
            lastSeek = target;
          }
        } else {
          video.playbackRate = rate;
          if (video.paused) {
            if (video.ended) video.currentTime = 0;
            const play = video.play();
            if (play) play.catch(() => {
              video.muted = true;
              void video.play().catch(() => { if (!disposed) setFailed(true); });
            });
          }
        }
      }
      const value = Math.round(progress * 1000);
      if (value !== lastReported) { lastReported = value; progressCallback.current?.(progress); }
    };
    const tick = (now: number) => {
      if (disposed) return;
      const explicit = currentSeek.current;
      let progress = explicit ?? Math.min(1, (now - startedAt) / Math.max(1, event.durationMs));
      if (reduced.matches && explicit === undefined) progress = .82;
      if (hold && explicit === undefined) progress = Math.min(0.92, progress);
      apply(progress);
      if (hold || (!reduced.matches && progress < 1)) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (disposed || ready || !root.current) return;
      ready = true;
      window.clearTimeout(loadTimer);
      root.current.dataset.ready = 'true';
      typography.push(...root.current.getAnimations({ subtree: true }));
      typography.forEach(item => item.pause());
      startedAt = performance.now();
      apply(reduced.matches ? .82 : (currentSeek.current ?? 0));
      readyCallback.current?.();
      raf = requestAnimationFrame(tick);
    };
    const fail = () => {
      if (disposed || ready) return;
      ready = true;
      window.clearTimeout(loadTimer);
      setFailed(true);
      readyCallback.current?.();
    };
    video?.addEventListener('error', fail, { once: true });
    void preloadChampion().then(({ videoUrl }) => {
      if (disposed || !video) return;
      video.src = videoUrl;
      video.load();
      if (video.readyState >= 2) start();
      else {
        video.addEventListener('loadeddata', start, { once: true });
        video.addEventListener('canplay', start, { once: true });
        loadTimer = window.setTimeout(fail, 8000);
      }
    }).catch(fail);
    return () => {
      disposed = true;
      window.clearTimeout(loadTimer);
      cancelAnimationFrame(raf);
      video?.removeEventListener('error', fail);
      video?.removeEventListener('loadeddata', start);
      video?.removeEventListener('canplay', start);
      video?.pause();
    };
  }, [event.durationMs, hold]);

  const title = '恭喜' + event.provinceName;
  return <section ref={root} className={styles.stage} data-failed={failed || undefined}
    aria-label={title + '，夺得量子膜订单总榜第一名'}>
    <div className={styles.frame}>
      <div className={styles.scene}>
        <video ref={videoRef} className={styles.dragon} muted playsInline preload="auto"
          disablePictureInPicture disableRemotePlayback aria-hidden="true" />
        <div className={styles.aura} aria-hidden="true" />
        <div className={styles.mark} aria-hidden="true">
          <div className={styles.trophy}>
            <img className={styles.crown} src="/screen-assets/crown.png" alt="" />
            <b className={styles.one} data-text="1">1</b>
          </div>
        </div>
        <div className={styles.plaque} aria-hidden="true" />
        <div className={styles.heading}>
          <h2 className={styles.title} data-text={title}
            style={{ fontSize: event.provinceName.length > 5 ? '4.45cqw' : event.provinceName.length > 3 ? '5.3cqw' : undefined }}>
            <span>{title}</span>
          </h2>
          <div className={styles.shine} aria-hidden="true" />
        </div>
        <p className={styles.subtitle}>夺得量子膜订单总榜第一名</p>
        <p className={styles.motto}><i />同心同行&nbsp; 驶向更大可能<i /></p>
        <span className={styles.leftBanner} aria-hidden="true">SAINT-GOBAIN</span>
        <span className={styles.rightBanner} aria-hidden="true">SAINT-GOBAIN</span>
        <div className={styles.vignette} aria-hidden="true" />
        {failed && <div className={styles.fallback}><b>1</b><strong>{title}</strong><span>夺得量子膜订单总榜第一名</span></div>}
      </div>
    </div>
  </section>;
}
