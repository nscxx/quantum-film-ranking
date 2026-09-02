'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubmitEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PACKAGE_RULES, PROVINCES } from '@/lib/order-race/config';
import type { PackageCode, ProvinceCode } from '@/lib/order-race/config';
import {
  ApiError,
  fetchControlSession,
  fetchRanking,
  loginControl,
  recordScore,
  revokeScore,
} from '@/lib/order-race/api-client';
import type { RankingSnapshot } from '@/lib/order-race/types';

type Notice = { tone: 'success' | 'error' | 'info'; message: string };

const PROVINCE_SORT_KEYS: Record<ProvinceCode, string> = {
  '110000': 'beijing',
  '120000': 'tianjin',
  '130000': 'hebei',
  '140000': 'shanxi',
  '150000': 'neimenggu',
  '210000': 'liaoning',
  '220000': 'jilin',
  '230000': 'heilongjiang',
  '310000': 'shanghai',
  '320000': 'jiangsu',
  '330000': 'zhejiang',
  '340000': 'anhui',
  '350000': 'fujian',
  '360000': 'jiangxi',
  '370000': 'shandong',
  '410000': 'henan',
  '420000': 'hubei',
  '430000': 'hunan',
  '440000': 'guangdong',
  '450000': 'guangxi',
  '460000': 'hainan',
  '500000': 'chongqing',
  '510000': 'sichuan',
  '520000': 'guizhou',
  '530000': 'yunnan',
  '540000': 'xizang',
  '610000': 'shaanxi',
  '620000': 'gansu',
  '630000': 'qinghai',
  '640000': 'ningxia',
  '650000': 'xinjiang',
};

const PROVINCE_OPTIONS = [...PROVINCES].sort((a, b) =>
  PROVINCE_SORT_KEYS[a.code].localeCompare(PROVINCE_SORT_KEYS[b.code]),
);

function formatTime(value: string) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function ControlPanel() {
  const [snapshot, setSnapshot] = useState<RankingSnapshot | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [provinceCode, setProvinceCode] = useState<ProvinceCode>(PROVINCES[0].code);
  const [packageCode, setPackageCode] = useState<PackageCode>('A');
  const [loading, setLoading] = useState<'login' | 'entry' | 'revoke' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await fetchRanking());
    } catch {
      setNotice({ tone: 'error', message: '暂时无法读取积分数据，页面会自动重试。' });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([fetchControlSession(), fetchRanking()])
      .then(([session, ranking]) => {
        if (!alive) return;
        setAuthenticated(session.authenticated);
        setSnapshot(ranking);
      })
      .catch(() => {
        if (alive) setAuthenticated(false);
      });
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const selectedProvince = useMemo(
    () => PROVINCES.find((province) => province.code === provinceCode) ?? PROVINCES[0],
    [provinceCode],
  );
  const selectedPackage = useMemo(
    () => PACKAGE_RULES.find((item) => item.code === packageCode) ?? PACKAGE_RULES[0],
    [packageCode],
  );

  async function submitLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('login');
    setNotice(null);
    try {
      await loginControl(password);
      setAuthenticated(true);
      setPassword('');
      setNotice({ tone: 'success', message: '后台已解锁，可以开始录入积分。' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '登录失败' });
    } finally {
      setLoading(null);
    }
  }

  async function submitEntry(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('entry');
    setNotice(null);
    try {
      const result = await recordScore(crypto.randomUUID(), provinceCode, packageCode);
      setNotice({
        tone: 'success',
        message: `${result.event.provinceName} ${result.event.packageTitle} 登记成功，积分 +${result.event.points}。`,
      });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '积分登记失败' });
    } finally {
      setLoading(null);
    }
  }

  async function revoke(id: string) {
    setLoading('revoke');
    setNotice(null);
    try {
      const result = await revokeScore(id);
      setNotice({
        tone: 'info',
        message: `${result.event.provinceName} ${result.event.packageTitle} 已撤销，积分 -${result.event.points}。`,
      });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '撤销失败' });
    } finally {
      setLoading(null);
    }
  }

  if (authenticated === null) {
    return <main className="score-control-shell"><div className="score-control-loading"><Sparkles /> 正在连接积分系统</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="score-control-shell">
        <div className="score-control-login">
          <div className="score-control-login-mark"><ShieldCheck /></div>
          <p>QUANTUM FILM SCORE CONTROL</p>
          <h1>积分录入后台</h1>
          <span>输入活动口令后，才可以为省份登记套餐积分。</span>
          <form onSubmit={submitLogin}>
            <label htmlFor="control-password">活动口令</label>
            <div><KeyRound /><input id="control-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入活动口令" /></div>
            <button disabled={loading === 'login' || !password} type="submit">{loading === 'login' ? '验证中' : '进入后台'} <ArrowUpRight /></button>
          </form>
          {notice && <div className={`score-control-notice ${notice.tone}`}>{notice.message}</div>}
          <a href="/" target="_blank" rel="noreferrer">打开实时大屏 <ArrowUpRight /></a>
        </div>
      </main>
    );
  }

  return (
    <main className="score-control-shell">
      <div className="score-control-container">
        <header className="score-control-header">
          <div><span><Zap fill="currentColor" /></span><p>量子膜积分控制台<small>省份 × 套餐加权积分</small></p></div>
        </header>

        {notice && <div className={`score-control-notice ${notice.tone}`}>{notice.tone === 'success' && <CheckCircle2 />}{notice.message}</div>}

        <div className="score-control-workspace">
          <section className="score-entry-card">
            <header><div><span>核心操作</span><h2>登记一条套餐积分</h2></div><i>大屏约1秒更新</i></header>
            <form onSubmit={submitEntry}>
              <label htmlFor="province-select">选择省份</label>
              <select id="province-select" value={provinceCode} onChange={(event) => setProvinceCode(event.target.value as ProvinceCode)}>
                {PROVINCE_OPTIONS.map((province) => (
                  <option key={province.code} value={province.code}>
                    {PROVINCE_SORT_KEYS[province.code][0].toUpperCase()} · {province.name}
                  </option>
                ))}
              </select>

              <fieldset>
                <legend>选择套餐</legend>
                {PACKAGE_RULES.map((item) => (
                  <button className={packageCode === item.code ? 'active' : ''} key={item.code} onClick={() => setPackageCode(item.code)} type="button">
                    <b>{item.code}</b><span>{item.title}<small>+{item.points}分</small></span>
                  </button>
                ))}
              </fieldset>

              <div className="score-entry-preview">
                <span>本次登记</span>
                <strong>{selectedProvince.name} · {selectedPackage.title}</strong>
                <p>{selectedPackage.description}</p>
                <b>+{selectedPackage.points}<small>分</small></b>
              </div>

              <button className="score-entry-submit" disabled={loading === 'entry'} type="submit">
                <Zap fill="currentColor" />{loading === 'entry' ? '正在写入' : `确认登记，积分 +${selectedPackage.points}`}
              </button>
            </form>
          </section>

          <section className="score-control-panel score-ranking-panel">
            <header><h2>当前省份排名</h2><span>每2秒刷新</span></header>
            <div>
              {snapshot?.provinces.map((province) => (
                <article key={province.code}><b>{province.rank}</b><span>{province.name}</span><i><em style={{ width: `${Math.max(0, province.score / Math.max(snapshot.provinces[0]?.score ?? 1, 1) * 100)}%` }} /></i><strong>{province.score.toLocaleString()}</strong></article>
              ))}
            </div>
          </section>

          <section className="score-control-panel score-recent-panel">
            <header><h2>最近录入</h2><span>撤销保留记录</span></header>
            <div>
              {snapshot?.recentEvents.map((item) => (
                <article className={item.revokedAt ? 'revoked' : ''} key={item.id}>
                  <b>{item.packageCode}</b>
                  <span><strong>{item.provinceName}</strong><small>{item.packageTitle} · {formatTime(item.createdAt)}</small></span>
                  <em>{item.revokedAt ? '已撤销' : `+${item.points}`}</em>
                  {!item.revokedAt && <button aria-label={`撤销${item.provinceName}${item.packageTitle}`} disabled={loading === 'revoke'} onClick={() => void revoke(item.id)}><RotateCcw />撤销</button>}
                </article>
              ))}
              {!snapshot?.recentEvents.length && <p className="score-control-empty">还没有积分记录，完成首次登记后会显示在这里。</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
