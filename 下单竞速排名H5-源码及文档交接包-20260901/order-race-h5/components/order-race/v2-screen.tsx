'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Layers3, Package, Users } from 'lucide-react';
import { fetchRanking } from '@/lib/order-race/api-client';
import { PACKAGE_RULES, PROVINCES, getScoreBand } from '@/lib/order-race/config';
import type { PackageScore, ProvinceScore, RankingSnapshot } from '@/lib/order-race/types';
import { ScreenAsset } from '@/components/order-race/screen-asset';
import { FullscreenButton } from '@/components/order-race/fullscreen-button';
import styles from './v2-screen.module.css';

function emptySnapshot(): RankingSnapshot {
  return {
    provinces: PROVINCES.map((province, index) => ({ ...province, score: 0, entryCount: 0, rank: index + 1, band: getScoreBand(0).id, latestScoreAt: null })),
    packages: PACKAGE_RULES.map((item) => ({ code: item.code, title: item.title, description: item.description, pointsPerEntry: item.points, score: 0, entryCount: 0, share: 0, tone: item.tone })),
    stats: { provinceCount: PROVINCES.length, activeProvinceCount: 0, totalScore: 0, leaderName: null },
    recentSubmissions: [],
    latestDisplayCursor: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!date.getTime()) return '--';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date).replaceAll('/', '-');
}

function shortName(name: string) {
  return name.replace(/省|市|自治区|壮族自治区|回族自治区|维吾尔自治区/g, '');
}

function SideList({ provinces, side }: { provinces: ProvinceScore[]; side: 'left' | 'right' }) {
  const items = side === 'left' ? provinces.slice(3, 15) : provinces.slice(3, 15);
  const max = Math.max(...provinces.map((item) => item.entryCount), 1);
  return (
    <section className={`${styles.sidePanel} ${side === 'right' ? styles.sidePanelRight : ''}`}>
      <header><h2>省份总榜</h2><span>TOP 4–30</span></header>
      <div className={styles.sideCaption}>订单量（单）</div>
      <div className={styles.sideList}>
        {items.map((province) => (
          <div className={styles.sideRow} key={province.code}>
            <b>{String(province.rank).padStart(2, '0')}</b>
            <span title={province.name}>{shortName(province.name)}</span>
            <i><em style={{ width: `${province.entryCount ? Math.max(8, province.entryCount / max * 100) : 0}%` }} /></i>
            <strong>{province.entryCount.toLocaleString()}</strong>
          </div>
        ))}
        <div className={styles.dots}>•••</div>
        <div className={styles.sideRow}><b className={styles.lastRank}>30</b><span>全国渠道</span><i><em style={{ width: '9%' }} /></i><strong>—</strong></div>
      </div>
    </section>
  );
}

function Podium({ province, rank }: { province: ProvinceScore; rank: 1 | 2 | 3 }) {
  return (
    <article className={`${styles.podium} ${styles[`podium${rank}`]}`}>
      {rank === 1 && <ScreenAsset name="crown" className={styles.crown} alt="" fallback={<span className={styles.crownFallback}>♛</span>} />}
      <div className={styles.medal}>{rank}</div>
      <div className={styles.podiumRank}>NO.{rank}</div>
      <strong>{shortName(province.name)}</strong>
      <b>{province.entryCount.toLocaleString()}</b>
      <small>单</small>
      {rank === 1 && <div className={styles.laurel}>✦</div>}
    </article>
  );
}

function PackageCard({ item }: { item: PackageScore }) {
  const tone = item.tone === 'violet' ? styles.packageViolet : item.tone === 'gold' ? styles.packageGold : styles.packageCyan;
  return (
    <article className={`${styles.packageCard} ${tone}`}>
      <ScreenAsset name={`package-${item.code.toLowerCase()}`} className={styles.packageIcon} alt="" fallback={<span className={styles.packageIconFallback}>{item.code}</span>} />
      <div className={styles.packageCopy}><strong>{item.title}</strong><small>{item.description}</small><b>{item.entryCount.toLocaleString()}<em>单</em></b></div>
      <div className={styles.donut} style={{ '--share': `${item.share}%` } as React.CSSProperties}><span>{item.share}%</span></div>
    </article>
  );
}

export function BigScreenV2() {
  const [snapshot, setSnapshot] = useState<RankingSnapshot>(emptySnapshot);
  const [connected, setConnected] = useState(false);
  const previous = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await fetchRanking();
        if (!alive) return;
        previous.current = new Map(next.provinces.map((province) => [province.code, province.score]));
        setSnapshot(next); setConnected(true);
      } catch { if (alive) setConnected(false); }
    };
    void load();
    const timer = window.setInterval(load, 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const totalOrders = useMemo(() => snapshot.packages.reduce((sum, item) => sum + item.entryCount, 0), [snapshot.packages]);
  const first = snapshot.provinces[0];
  const second = snapshot.provinces[1];
  const third = snapshot.provinces[2];
  const middle = snapshot.provinces.slice(3, 7);

  return (
    <main className={styles.viewport}>
      <div className={styles.stage}>
        <div className={styles.stars} /><div className={styles.glow} /><div className={styles.grid} />
        <header className={styles.header}>
          <div className={styles.brand}><ScreenAsset name="logo-quantum" className={styles.logo} alt="Quantum 量子膜" fallback={<div className={styles.brandMark}>Q</div>} /></div>
          <div className={styles.title}><h1>省份总榜</h1><p>经销商大会当日订单竞争榜</p></div>
          <div className={styles.live}><i className={connected ? styles.online : ''} /><span>{connected ? '实时更新' : '连接中'}</span><small>{formatDate(snapshot.updatedAt)}</small><FullscreenButton /></div>
        </header>

        <section className={styles.stats}>
          <div className={styles.stat}><ScreenAsset name="kpi-dimension" className={styles.statIcon} alt="" fallback={<Package />} /><p><span>当日订单总量</span><strong>{totalOrders.toLocaleString()}<em>单</em></strong></p></div>
          <div className={styles.stat}><ScreenAsset name="kpi-provinces" className={styles.statIcon} alt="" fallback={<Users />} /><p><span>参与省份</span><strong>{snapshot.stats.activeProvinceCount}<em>个</em></strong></p></div>
          <div className={styles.stat}><ScreenAsset name="kpi-score" className={styles.statIcon} alt="" fallback={<Activity />} /><p><span>领先省份</span><strong>{first ? shortName(first.name) : '—'}</strong></p></div>
          <div className={styles.stat}><ScreenAsset name="kpi-status" className={styles.statIcon} alt="" fallback={<Layers3 />} /><p><span>量子膜订单总量</span><strong>{totalOrders.toLocaleString()}<em>单</em></strong></p></div>
        </section>

        <div className={styles.content}>
          <SideList provinces={snapshot.provinces} side="left" />
          <section className={styles.center}>
            <div className={styles.halo} />
            <div className={styles.podiums}>{second && <Podium province={second} rank={2} />}{first && <Podium province={first} rank={1} />}{third && <Podium province={third} rank={3} />}</div>
            <div className={styles.middleList}>{middle.map((province) => <div key={province.code}><b>{province.rank}</b><span>{shortName(province.name)}</span><i><em style={{ width: `${Math.max(8, province.entryCount / Math.max(first?.entryCount ?? 1, 1) * 100)}%` }} /></i><strong>{province.entryCount.toLocaleString()}单</strong></div>)}</div>
            <section className={styles.packages}><h2>产品套餐订单量 <small>（单 / 占比）</small></h2><div>{snapshot.packages.map((item) => <PackageCard item={item} key={item.code} />)}</div></section>
          </section>
          <SideList provinces={snapshot.provinces} side="right" />
        </div>
        <footer>数据来源：销售系统　　数据时间：经销商大会当日</footer>
      </div>
    </main>
  );
}
