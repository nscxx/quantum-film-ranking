'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, ClipboardList, Crown, Package, Users } from 'lucide-react';
import { ChinaScoreMap } from '@/components/order-race/china-score-map';
import { CelebrationLayer } from '@/components/order-race/celebration-layer';
import { FullscreenButton } from '@/components/order-race/fullscreen-button';
import { ScreenAsset } from '@/components/order-race/screen-asset';
import { fetchDisplayEvents, fetchRanking } from '@/lib/order-race/api-client';
import { PACKAGE_RULES, PROVINCES, SCORE_COLOR_BANDS, getScoreBand } from '@/lib/order-race/config';
import { expandDisplayEvent } from '@/lib/order-race/celebrations';
import type { CelebrationEvent, PackageScore, ProvinceScore, RankingSnapshot } from '@/lib/order-race/types';

const DISPLAY_CURSOR_KEY = 'quantum-film-display-cursor';

function createEmptySnapshot(): RankingSnapshot {
  return {
    provinces: PROVINCES.map((province, index) => ({
      ...province,
      score: 0,
      entryCount: 0,
      rank: index + 1,
      band: getScoreBand(0).id,
      latestScoreAt: null,
    })),
    packages: PACKAGE_RULES.map((item) => ({
      code: item.code,
      title: item.title,
      description: item.description,
      pointsPerEntry: item.points,
      score: 0,
      entryCount: 0,
      share: 0,
      tone: item.tone,
    })),
    stats: {
      provinceCount: PROVINCES.length,
      activeProvinceCount: 0,
      totalScore: 0,
      leaderName: null,
    },
    recentSubmissions: [],
    latestDisplayCursor: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

function Corners() {
  return (
    <span className="quantum-corners" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function SideRanking({ provinces, start, end, activeCode }: { provinces: ProvinceScore[]; start: number; end: number; activeCode?: string }) {
  const items = provinces.slice(start - 1, end);
  const maxScore = Math.max(...provinces.slice(3).map((item) => item.score), 1);
  return (
    <section className="quantum-side-panel">
      <Corners />
      <header>
        <h2>省份总榜</h2>
        <span>{start}-{end}名</span>
      </header>
      <div className="quantum-side-list">
        {items.map((province) => (
          <div className={`quantum-side-row${province.code === activeCode ? ' is-celebrating' : ''}`} key={province.code}>
            <b>{province.rank}</b>
            <span title={province.name}>{province.name}</span>
            <i>
              <em style={{ width: `${province.score === 0 ? 0 : Math.max(8, (province.score / maxScore) * 100)}%` }} />
            </i>
            <strong>{province.score.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreRing({ share, tone }: { share: number; tone: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - Math.min(100, Math.max(0, share)) / 100);
  return (
    <svg className={`quantum-donut tone-${tone}`} viewBox="0 0 44 44" aria-hidden="true">
      <circle className="quantum-donut-track" cx="22" cy="22" r={radius} />
      <circle
        className="quantum-donut-value"
        cx="22"
        cy="22"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={dash}
      />
      <text x="22" y="24">{share}%</text>
    </svg>
  );
}

function DashBar({ share }: { share: number }) {
  const lit = Math.round((Math.min(100, Math.max(0, share)) / 100) * 22);
  return (
    <div className="quantum-dashes" aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <i className={index < lit ? 'is-on' : ''} key={index} />
      ))}
    </div>
  );
}

function StatCard({
  asset,
  tone,
  icon,
  label,
  value,
}: {
  asset: string;
  tone: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <article>
      <Corners />
      <div className={`quantum-stat-icon ${tone}`}>
        <ScreenAsset name={asset} className="quantum-asset-icon" fallback={icon} />
      </div>
      <p>
        {label}
        <strong>{value}</strong>
      </p>
    </article>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '--';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replaceAll('/', '-');
}

function PodiumCard({ province, rank, active }: { province: ProvinceScore; rank: 1 | 2 | 3; active?: boolean }) {
  return (
    <article className={`quantum-podium rank-${rank}${active ? ' is-celebrating' : ''}`}>
      <div className="quantum-podium-frame" aria-hidden="true" />
      <ScreenAsset name="crown" className="quantum-crown-img" fallback={<Crown className="quantum-crown" fill="currentColor" />} />
      <em>NO.{rank}</em>
      <strong>{province.name}</strong>
      <b className={province.score >= 1000000 ? 'is-long-score' : undefined}>{province.score.toLocaleString('zh-CN')}<small>分</small></b>
      {/* City artwork belongs to the rank, never to the province. */}
      <ScreenAsset
        name={`podium-${rank}`}
        className="quantum-skyline-img"
        fallback={<div className="quantum-skyline" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
      />
      <div className="quantum-podium-base" aria-hidden="true">
        <div className="quantum-stage-slim-base"><span /></div>
        <svg className="quantum-stage-orbit" viewBox="0 0 400 90" preserveAspectRatio="none">
          <ellipse className="quantum-orbit-track" cx="200" cy="45" rx="192" ry="34" />
          <ellipse className="quantum-orbit-comet" cx="200" cy="45" rx="192" ry="34" pathLength="100" />
          <ellipse className="quantum-orbit-comet quantum-orbit-comet-second" cx="200" cy="45" rx="192" ry="34" pathLength="100" />
        </svg>
        <span className="quantum-stage-flare quantum-stage-flare-left" />
        <span className="quantum-stage-flare quantum-stage-flare-right" />
      </div>
    </article>
  );
}

function PackageCard({ item }: { item: PackageScore }) {
  const assetName = `package-${item.code.toLowerCase()}`;
  return (
    <article className={`quantum-package ${item.tone}`}>
      <Corners />
      <div className="quantum-cube">
        <ScreenAsset name={assetName} className="quantum-package-icon" fallback={<span>{item.code}</span>} />
      </div>
      <p>
        <strong>{item.title}</strong>
        <small>{item.description}</small>
        <b>
          {item.score.toLocaleString()}
          <em>分</em>
        </b>
        <i>
          占比 {item.share}% · 单次 {item.pointsPerEntry}分
        </i>
      </p>
      <DashBar share={item.share} />
      <ScoreRing share={item.share} tone={item.tone} />
    </article>
  );
}

export function BigScreen({ preview = false }: { preview?: boolean }) {
  const [snapshot, setSnapshot] = useState<RankingSnapshot>(createEmptySnapshot);
  const [connected, setConnected] = useState(false);
  const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([]);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const displayCursor = useRef<number | null>(null);

  const activeCelebration = celebrations[0] ?? null;

  useEffect(() => {
    if (!experienceStarted || !activeCelebration) return;
    const timer = window.setTimeout(() => {
      setCelebrations((current) => current[0]?.celebrationId === activeCelebration.celebrationId ? current.slice(1) : current);
    }, activeCelebration.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeCelebration, experienceStarted]);

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await fetchRanking();
        if (!alive) return;
        if (displayCursor.current === null) {
          const storedValue = preview ? null : window.sessionStorage.getItem(DISPLAY_CURSOR_KEY);
          const stored = storedValue === null ? null : Number(storedValue);
          displayCursor.current = stored !== null && Number.isSafeInteger(stored) && stored >= 0 && stored <= next.latestDisplayCursor
            ? stored
            : next.latestDisplayCursor;
        }
        setSnapshot(next);
        let hasMore = true;
        while (hasMore && displayCursor.current !== null) {
          const page = await fetchDisplayEvents(displayCursor.current);
          if (!alive) return;
          if (page.events.length && !preview) {
            const incoming = page.events.flatMap(expandDisplayEvent);
            setCelebrations((current) => {
              const known = new Set(current.map((event) => event.celebrationId));
              return [...current, ...incoming.filter((event) => !known.has(event.celebrationId))];
            });
          }
          displayCursor.current = page.nextCursor;
          if (!preview) window.sessionStorage.setItem(DISPLAY_CURSOR_KEY, String(page.nextCursor));
          hasMore = page.hasMore;
        }
        setConnected(true);
      } catch {
        if (alive) setConnected(false);
      } finally {
        inFlight = false;
      }
    };

    void load();
    const interval = window.setInterval(load, 1000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [preview]);

  const second = snapshot.provinces[1];
  const first = snapshot.provinces[0];
  const third = snapshot.provinces[2];
  const mapFloor = useMemo(
    () => <ScreenAsset name="map-floor" className="quantum-map-floor" alt="" />,
    [],
  );

  return (
    <main className="quantum-viewport">
      {preview && <div style={{ position: 'fixed', zIndex: 500, top: 12, left: 12, padding: 12, background: '#07152f', color: 'white', border: '1px solid #70eaf5', borderRadius: 8 }}>
        <strong>动效与声音验收 · 不录入积分</strong>
        <p style={{ margin: '6px 0' }}>先点击大屏启动按钮，再选择效果。会播放正式 BGM 与对应庆祝音效。</p>
        {(['score', 'milestone', 'top3', 'champion', 'all'] as const).map((type, index) => <button key={type} disabled={!experienceStarted || celebrations.length > 0} style={{ marginRight: 8, padding: 8, borderRadius: 4, background: '#70eaf5', color: '#07152f', opacity: !experienceStarted || celebrations.length > 0 ? .4 : 1 }} onClick={() => {
          const id = crypto.randomUUID();
          const events = expandDisplayEvent({ id, submissionId: id, cursor: 0, provinceCode: '440000', provinceName: '广东省', packageSummary: 'A×2 · B×3', totalPoints: 770, scoreBefore: 630, scoreAfter: 1400, rankBefore: 4, rankAfter: 1, milestone: 1400, createdAt: new Date().toISOString() });
          setCelebrations(type === 'all' ? events : events.filter((event) => event.type === type));
        }}>{['加分 · 2秒', '阶段 · 3秒', '前三 · 5秒', '冠军 · 8秒', '完整连播 · 18秒'][index]}</button>)}
      </div>}
      <div className="quantum-stage">
        <ScreenAsset name="bg-circuit" className="quantum-bg-circuit" alt="" />
        <div className="quantum-grid" aria-hidden="true" />

        <header className="quantum-header">
          <div className="quantum-brand" aria-label="量子膜">
            <ScreenAsset
              name="logo-quantum"
              className="quantum-logo"
              alt="Quantum 量子膜"
              fallback={
                <>
                  <span className="quantum-brand-mark">Q</span>
                  <div>
                    <strong>Quantum</strong>
                    <small>量 子 膜</small>
                  </div>
                </>
              }
            />
          </div>
          <div className="quantum-title">
            <span />
            <h1>量子膜订单积分竞赛榜</h1>
            <span />
          </div>
          <div className={`quantum-live${connected ? '' : ' is-offline'}`}>
            <p>
              <i />
              实时状态：{connected ? '正常' : '连接中'}
            </p>
            <small>更新时间：{formatUpdatedAt(snapshot.updatedAt)}</small>
            <FullscreenButton />
          </div>
        </header>

        <section className="quantum-stats">
          <StatCard
            asset="kpi-dimension"
            icon={<Package />}
            tone="cyan"
            label="当前维度"
            value="全国省份"
          />
          <StatCard
            asset="kpi-provinces"
            icon={<Users />}
            tone="violet"
            label="参与省份"
            value={
              <>
                {snapshot.stats.provinceCount}
                <small>个</small>
              </>
            }
          />
          <StatCard
            asset="kpi-score"
            icon={<ClipboardList />}
            tone="blue"
            label="总积分"
            value={
              <>
                {snapshot.stats.totalScore.toLocaleString()}
                <small>分</small>
              </>
            }
          />
          <StatCard
            asset="kpi-status"
            icon={<Activity />}
            tone="teal"
            label="实时状态"
            value={connected ? '正常' : '连接中'}
          />
        </section>

        <div className="quantum-main-grid">
          <SideRanking provinces={snapshot.provinces} start={4} end={17} activeCode={activeCelebration?.provinceCode} />
          <section className="quantum-center">
            <div className="quantum-podiums">
              {second && <PodiumCard province={second} rank={2} active={second.code === activeCelebration?.provinceCode} />}
              {first && <PodiumCard province={first} rank={1} active={first.code === activeCelebration?.provinceCode} />}
              {third && <PodiumCard province={third} rank={3} active={third.code === activeCelebration?.provinceCode} />}
            </div>
            <div className="quantum-map-zone">
              {mapFloor}
              <div className="quantum-map-ring" />
              <div className="quantum-map-shadow" />
              <ChinaScoreMap provinces={snapshot.provinces} changedProvinceCode={activeCelebration?.provinceCode ?? null} />
              <aside className="quantum-legend">
                <strong>积分数（分）</strong>
                {SCORE_COLOR_BANDS.map((band) => (
                  <span key={band.id}>
                    <i style={{ color: band.color, background: band.color }} />
                    {band.label}
                  </span>
                ))}
              </aside>
            </div>
          </section>
          <SideRanking provinces={snapshot.provinces} start={18} end={31} activeCode={activeCelebration?.provinceCode} />
        </div>

        <section className="quantum-packages">
          <Corners />
          <h2>产品套餐积分</h2>
          <div>
            {snapshot.packages.map((item) => (
              <PackageCard item={item} key={item.code} />
            ))}
          </div>
        </section>
        <CelebrationLayer
          active={activeCelebration}
          queueLength={celebrations.length}
          started={experienceStarted}
          onStarted={() => setExperienceStarted(true)}
        />
      </div>
    </main>
  );
}
