'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, ClipboardList, Crown, Package, Users } from 'lucide-react';
import { ChinaScoreMap } from '@/components/order-race/china-score-map';
import { ScreenAsset } from '@/components/order-race/screen-asset';
import { fetchRanking } from '@/lib/order-race/api-client';
import { PACKAGE_RULES, PROVINCES, SCORE_COLOR_BANDS, getScoreBand } from '@/lib/order-race/config';
import type { PackageScore, ProvinceScore, RankingSnapshot } from '@/lib/order-race/types';

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
    recentEvents: [],
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

function SideRanking({ provinces, start, end }: { provinces: ProvinceScore[]; start: number; end: number }) {
  const items = provinces.slice(start - 1, end);
  const maxScore = Math.max(...provinces.slice(3, 30).map((item) => item.score), 1);
  return (
    <section className="quantum-side-panel">
      <Corners />
      <header>
        <h2>省份总榜</h2>
        <span>{start}-{end}名</span>
      </header>
      <div className="quantum-side-list">
        {items.map((province) => (
          <div className="quantum-side-row" key={province.code}>
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

function PodiumCard({ province, rank }: { province: ProvinceScore; rank: 1 | 2 | 3 }) {
  return (
    <article className={`quantum-podium rank-${rank}`}>
      {rank === 1 && (
        <ScreenAsset
          name="crown"
          className="quantum-crown-img"
          fallback={<Crown className="quantum-crown" fill="currentColor" />}
        />
      )}
      <em>NO.{rank}</em>
      <strong>{province.name}</strong>
      <b>{province.score.toLocaleString()}</b>
      <ScreenAsset
        name={`podium-${rank}`}
        className="quantum-skyline-img"
        fallback={
          <div className="quantum-skyline" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        }
      />
    </article>
  );
}

function PackageCard({ item }: { item: PackageScore }) {
  const assetName = `package-${item.code.toLowerCase()}`;
  return (
    <article className={`quantum-package ${item.tone}`}>
      <Corners />
      <div className="quantum-cube">
        <ScreenAsset
          name={assetName}
          className="quantum-package-icon"
          fallback={<span>{item.code}</span>}
        />
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

export function BigScreen() {
  const [snapshot, setSnapshot] = useState<RankingSnapshot>(createEmptySnapshot);
  const [connected, setConnected] = useState(false);
  const [changedProvinceCode, setChangedProvinceCode] = useState<string | null>(null);
  const previousScores = useRef<Map<string, number> | null>(null);
  const clearPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await fetchRanking();
        if (!alive) return;
        const nextScores = new Map(next.provinces.map((province) => [province.code, province.score]));
        if (previousScores.current) {
          const changed = next.provinces.find((province) => previousScores.current?.get(province.code) !== province.score);
          if (changed) {
            setChangedProvinceCode(changed.code);
            if (clearPulseTimer.current) clearTimeout(clearPulseTimer.current);
            clearPulseTimer.current = setTimeout(() => setChangedProvinceCode(null), 1400);
          }
        }
        previousScores.current = nextScores;
        setSnapshot(next);
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
      if (clearPulseTimer.current) clearTimeout(clearPulseTimer.current);
    };
  }, []);

  const second = snapshot.provinces[1];
  const first = snapshot.provinces[0];
  const third = snapshot.provinces[2];
  const mapFloor = useMemo(
    () => <ScreenAsset name="map-floor" className="quantum-map-floor" alt="" />,
    [],
  );

  return (
    <main className="quantum-viewport">
      <div className="quantum-stage">
        <ScreenAsset name="bg-circuit" className="quantum-bg-circuit" alt="" />
        <div className="quantum-grid" aria-hidden="true" />

        <header className="quantum-header">
          <div className="quantum-brand" aria-label="圣戈班">
            <ScreenAsset
              name="logo-saint-gobain-reference"
              className="quantum-logo"
              alt="SAINT-GOBAIN 圣戈班"
              fallback={
                <>
                  <span className="quantum-brand-mark">SG</span>
                  <div>
                    <strong>SAINT-GOBAIN</strong>
                    <small>圣 戈 班</small>
                  </div>
                </>
              }
            />
          </div>
          <div className="quantum-title">
            <span />
            <h1>量子膜订单竞争榜</h1>
            <span />
          </div>
          <div className={`quantum-live${connected ? '' : ' is-offline'}`}>
            <p>
              <i />
              实时状态：{connected ? '正常' : '连接中'}
            </p>
            <small>更新时间：{formatUpdatedAt(snapshot.updatedAt)}</small>
          </div>
        </header>

        <section className="quantum-stats">
          <StatCard
            asset="kpi-dimension"
            tone="cyan"
            icon={<Package />}
            label="当前维度"
            value="全国省份"
          />
          <StatCard
            asset="kpi-provinces"
            tone="violet"
            icon={<Users />}
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
            tone="blue"
            icon={<ClipboardList />}
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
            tone="teal"
            icon={<Activity />}
            label="实时状态"
            value={connected ? '正常' : '连接中'}
          />
        </section>

        <div className="quantum-main-grid">
          <SideRanking provinces={snapshot.provinces} start={4} end={16} />
          <section className="quantum-center">
            <div className="quantum-podiums">
              {second && <PodiumCard province={second} rank={2} />}
              {first && <PodiumCard province={first} rank={1} />}
              {third && <PodiumCard province={third} rank={3} />}
            </div>
            <div className="quantum-map-zone">
              {mapFloor}
              <div className="quantum-map-ring" />
              <div className="quantum-map-shadow" />
              <ChinaScoreMap provinces={snapshot.provinces} changedProvinceCode={changedProvinceCode} />
              <aside className="quantum-legend">
                <strong>积分</strong>
                {[...SCORE_COLOR_BANDS].reverse().map((band) => (
                  <span key={band.id}>
                    <i style={{ color: band.color, background: band.color }} />
                    {band.label}
                  </span>
                ))}
              </aside>
            </div>
          </section>
          <SideRanking provinces={snapshot.provinces} start={17} end={30} />
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
      </div>
    </main>
  );
}
