'use client';

import { useEffect, useRef, useState } from 'react';
import { Crown, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { enterFullscreen } from '@/hooks/use-fullscreen';
import { createScreenAudio, type ScreenAudio } from '@/lib/order-race/audio';
import { CHAMPION_LOOPS, CHAMPION_PLAY_RATIO } from '@/lib/order-race/celebrations';
import type { CelebrationEvent } from '@/lib/order-race/types';
import { MilestoneCelebration } from './milestone-celebration';
import { TopThreeCelebration, preloadTopThree } from './top3-celebration';
import { ChampionCelebration, preloadChampion } from './champion-celebration';
import { BigCustomerCelebration } from './big-customer-celebration';

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);
  return <>{display.toLocaleString()}</>;
}

export function CelebrationLayer({
  active,
  queueLength,
  started,
  onStarted,
  onActiveReady,
}: {
  active: CelebrationEvent | null;
  queueLength: number;
  started: boolean;
  onStarted: () => void;
  onActiveReady: (celebrationId: string) => void;
}) {
  const engineRef = useRef<ScreenAudio | null>(null);
  const [muted, setMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [visualReadyId, setVisualReadyId] = useState<string | null>(null);

  useEffect(() => { void preloadTopThree().catch(() => undefined); }, []);
  useEffect(() => { void preloadChampion().catch(() => undefined); }, []);

  useEffect(() => () => {
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !audioReady) return;
    if (active && (active.type !== 'champion' || visualReadyId === active.celebrationId)) {
      engine.playCelebration(active.type, active.type === 'champion'
        ? { loops: CHAMPION_LOOPS, everyMs: active.durationMs * CHAMPION_PLAY_RATIO / CHAMPION_LOOPS }
        : undefined);
    }
    else engine.restoreBgm();
  }, [active, audioReady, visualReadyId]);

  useEffect(() => {
    if (!active) return;
    if (active.type !== 'champion') {
      onActiveReady(active.celebrationId);
    }
  }, [active, onActiveReady]);

  function markChampionReady() {
    if (!active || active.type !== 'champion') return;
    setVisualReadyId(active.celebrationId);
    onActiveReady(active.celebrationId);
  }

  async function start() {
    try {
      if (!engineRef.current) engineRef.current = createScreenAudio();
      engineRef.current.setMuted(muted);
    } catch {
      engineRef.current = null;
    }
    void enterFullscreen();
    onStarted();
    try {
      const ready = await engineRef.current?.start();
      setAudioReady(Boolean(ready));
    } catch { setAudioReady(false); }
  }

  const copy = active?.type === 'champion'
    ? { eyebrow: 'NATIONAL CHAMPION', title: '全国第一', detail: `登顶 NO.1 · ${active.scoreAfter.toLocaleString()}分`, icon: <Crown /> }
    : active?.type === 'top3'
      ? { eyebrow: 'TOP THREE ARRIVAL', title: '新晋全国前三', detail: `跃升至 NO.${active.rankAfter}`, icon: <Trophy /> }
      : active?.type === 'milestone'
        ? { eyebrow: 'SCORE MILESTONE', title: '积分阶段突破', detail: `达成 ${active.milestone?.toLocaleString()}分阶段`, icon: <Zap /> }
        : { eyebrow: 'SCORE INJECTION', title: '积分能量注入', detail: active?.packageSummary ?? '', icon: <Zap /> };

  return (
    <>
      {!started && (
        <div className="quantum-sound-gate">
          <div className="quantum-sound-gate-ring"><Volume2 /></div>
          <small>QUANTUM FILM LIVE</small>
          <h2>实时积分竞赛即将开始</h2>
          <p>开启全屏、背景音乐与逐次加分动效</p>
          <button onClick={() => void start()} type="button"><Zap fill="currentColor" />进入全屏并开启声音</button>
        </div>
      )}
      {started && (
        <button className="quantum-sound-toggle" onClick={() => audioReady ? setMuted((value) => !value) : void start()} type="button" aria-label={!audioReady ? '重试开启声音' : muted ? '恢复声音' : '静音'}>
          {muted ? <VolumeX /> : <Volume2 />}
          <span>{!audioReady ? '声音未启动 · 点击重试' : muted ? '已静音' : '声音开启'}</span>
        </button>
      )}
      {started && active && (
        <output className={`quantum-celebration type-${active.type}`} style={active.type !== 'score' ? { inset: 0 } : undefined} key={active.celebrationId} aria-live="polite">
          {active.type === 'bigCustomer' ? <BigCustomerCelebration event={active} /> : active.type === 'milestone' ? <MilestoneCelebration event={active} /> : active.type === 'top3' ? <TopThreeCelebration event={active} /> : active.type === 'champion' ? <ChampionCelebration event={active} onReady={markChampionReady} /> : <>
          <div className="quantum-celebration-vignette" />
          <div className="quantum-energy-beam" />
          <div className="quantum-energy-orbit orbit-a" />
          <div className="quantum-energy-orbit orbit-b" />
          <div className="quantum-energy-particles" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--particle': index } as React.CSSProperties} />)}
          </div>
          <section className="quantum-celebration-core">
            <div className="quantum-celebration-icon">{copy.icon}</div>
            <small>{copy.eyebrow}</small>
            <h2>{copy.title}</h2>
            <strong>{active.provinceName}</strong>
            {active.type === 'score'
              ? <b>+<CountUp value={active.totalPoints} /><em>分</em></b>
              : <b>{active.scoreAfter.toLocaleString()}<em>分</em></b>}
            <p>{copy.detail}</p>
            <div className="quantum-celebration-progress"><i style={{ animationDuration: `${active.durationMs}ms` }} /></div>
          </section>
          </>}
          {queueLength > 1 && <span className="quantum-queue-count">待播放 {queueLength - 1}</span>}
        </output>
      )}
    </>
  );
}
