'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubmitEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  Eraser,
  KeyRound,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { PACKAGE_RULES, PROVINCES } from '@/lib/order-race/config';
import type { PackageCode, ProvinceCode } from '@/lib/order-race/config';
import {
  ApiError,
  downloadScoreExport,
  fetchControlSession,
  fetchRanking,
  loginControl,
  recordScore,
  clearAllScores,
  revokeScore,
  savePackagePoints,
  triggerBigCustomerCelebration,
} from '@/lib/order-race/api-client';
import type { RankingSnapshot } from '@/lib/order-race/types';
import { createClientId } from '@/lib/order-race/id';

type Notice = { tone: 'success' | 'error' | 'info'; message: string };
type Quantities = Record<PackageCode, number>;
type PointDrafts = Record<PackageCode, string>;

const PROVINCE_SORT_KEYS: Record<ProvinceCode, string> = {
  '110000': 'beijing', '120000': 'tianjin', '130000': 'hebei', '140000': 'shanxi',
  '150000': 'neimenggu', '210000': 'liaoning', '220000': 'jilin', '230000': 'heilongjiang',
  '310000': 'shanghai', '320000': 'jiangsu', '330000': 'zhejiang', '340000': 'anhui',
  '350000': 'fujian', '360000': 'jiangxi', '370000': 'shandong', '410000': 'henan',
  '420000': 'hubei', '430000': 'hunan', '440000': 'guangdong', '450000': 'guangxi',
  '460000': 'hainan', '500000': 'chongqing', '510000': 'sichuan', '520000': 'guizhou',
  '530000': 'yunnan', '540000': 'xizang', '610000': 'shaanxi', '620000': 'gansu',
  '630000': 'qinghai', '640000': 'ningxia', '650000': 'xinjiang',
};

const PROVINCE_OPTIONS = [...PROVINCES].sort((a, b) =>
  PROVINCE_SORT_KEYS[a.code].localeCompare(PROVINCE_SORT_KEYS[b.code]),
);
const INITIAL_QUANTITIES: Quantities = { A: 0, B: 0, C: 0 };

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
  const [quantities, setQuantities] = useState<Quantities>(INITIAL_QUANTITIES);
  const [pointDrafts, setPointDrafts] = useState<PointDrafts>({
    A: String(PACKAGE_RULES[0].points),
    B: String(PACKAGE_RULES[1].points),
    C: String(PACKAGE_RULES[2].points),
  });
  const [loading, setLoading] = useState<'login' | 'entry' | 'revoke' | 'package' | 'export' | 'reset' | 'bigCustomer' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

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
        setPointDrafts(Object.fromEntries(ranking.packages.map((item) => [item.code, String(item.pointsPerEntry)])) as PointDrafts);
      })
      .catch(() => { if (alive) setAuthenticated(false); });
    const timer = setInterval(() => void refresh(), 2000);
    return () => { alive = false; clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    if (!resetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeResetDialog();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetOpen, loading]);

  const selectedProvince = useMemo(
    () => PROVINCES.find((province) => province.code === provinceCode) ?? PROVINCES[0],
    [provinceCode],
  );
  const pointsByPackage = useMemo(() => new Map(
    (snapshot?.packages ?? PACKAGE_RULES.map((rule) => ({ code: rule.code, pointsPerEntry: rule.points })))
      .map((item) => [item.code, item.pointsPerEntry]),
  ), [snapshot]);
  const selectedItems = useMemo(() => PACKAGE_RULES
    .filter((item) => quantities[item.code] > 0)
    .map((item) => ({
      ...item,
      quantity: quantities[item.code],
      unitPoints: pointsByPackage.get(item.code) ?? item.points,
    })), [pointsByPackage, quantities]);
  const totalPoints = selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPoints, 0);
  const packageSummary = selectedItems.map((item) => `${item.code}×${item.quantity}`).join(' · ');

  function selectPackage(code: PackageCode, checked: boolean) {
    setQuantities((current) => ({ ...current, [code]: checked ? Math.max(1, current[code]) : 0 }));
  }

  function setQuantity(code: PackageCode, quantity: number) {
    setQuantities((current) => ({ ...current, [code]: Math.min(999, Math.max(1, Math.trunc(quantity || 1))) }));
  }

  async function submitLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading('login'); setNotice(null);
    try {
      await loginControl(password); setAuthenticated(true); setPassword('');
      setNotice({ tone: 'success', message: '后台已解锁，可以开始录入积分。' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '登录失败' });
    } finally { setLoading(null); }
  }

  async function submitEntry(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItems.length) return;
    setLoading('entry'); setNotice(null);
    try {
      const result = await recordScore(
        createClientId(),
        provinceCode,
        selectedItems.map((item) => ({ packageCode: item.code, quantity: item.quantity })),
      );
      setQuantities({ ...INITIAL_QUANTITIES });
      setNotice({
        tone: 'success',
        message: `${result.submission.provinceName} ${packageSummary} 登记成功，积分 +${result.submission.totalPoints}，大屏动效已排队。`,
      });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '积分登记失败' });
    } finally { setLoading(null); }
  }

  async function revoke(id: string) {
    setLoading('revoke'); setNotice(null);
    try {
      const result = await revokeScore(id);
      setNotice({
        tone: 'info',
        message: `${result.submission.provinceName} ${result.submission.items.map((item) => `${item.packageCode}×${item.quantity}`).join(' · ')} 已整单撤销，积分 -${result.submission.totalPoints}。`,
      });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '撤销失败' });
    } finally { setLoading(null); }
  }

  async function updatePoints(code: PackageCode) {
    const nextPoints = Number(pointDrafts[code]);
    if (!Number.isInteger(nextPoints) || nextPoints < 1 || nextPoints > 100000) {
      setNotice({ tone: 'error', message: '套餐积分必须是1至100000的整数。' });
      return;
    }
    const current = snapshot?.packages.find((item) => item.code === code)?.pointsPerEntry;
    if (!window.confirm(`将${code}套餐单件积分从 ${current ?? '-'} 改为 ${nextPoints}？\n仅影响之后的录入，历史积分不会重算。`)) return;
    setLoading('package'); setNotice(null);
    try {
      await savePackagePoints(code, nextPoints);
      setNotice({ tone: 'success', message: `${code}套餐已更新为 ${nextPoints}分/件，仅影响后续录入。` });
      setPointDrafts((current) => ({ ...current, [code]: String(nextPoints) }));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '套餐积分保存失败' });
    } finally { setLoading(null); }
  }

  async function exportScores() {
    setLoading('export'); setNotice(null);
    try {
      await downloadScoreExport();
      setNotice({ tone: 'success', message: '已下载 Excel，内含「明细」和「汇总」两张表。' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '导出失败' });
    } finally { setLoading(null); }
  }

  function openResetDialog() {
    setResetPassword('');
    setResetError(null);
    setResetOpen(true);
  }

  function closeResetDialog() {
    if (loading === 'reset') return;
    setResetOpen(false);
    setResetPassword('');
    setResetError(null);
  }

  async function submitReset(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPassword) return;
    setLoading('reset');
    setResetError(null);
    try {
      const result = await clearAllScores(resetPassword);
      setResetOpen(false);
      setResetPassword('');
      setNotice({
        tone: 'success',
        message: result.clearedCount
          ? `已彻底清零 ${result.clearedCount} 条积分单和大屏动效记录。套餐分值、省份数量未改动。`
          : '当前没有积分记录，无需清零。套餐分值、省份数量未改动。',
      });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthenticated(false);
        setResetOpen(false);
        setNotice({ tone: 'error', message: error.message });
      } else {
        setResetError(error instanceof Error ? error.message : '全部清零失败');
      }
    } finally { setLoading(null); }
  }

  async function launchBigCustomer() {
    if (!window.confirm('确认在现场大屏播放“杭州保通科技实业有限公司”大客户订单特效？')) return;
    setLoading('bigCustomer'); setNotice(null);
    try {
      await triggerBigCustomerCelebration();
      setNotice({ tone: 'success', message: '大客户订单特效已发送，大屏将在当前动效结束后播放。' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticated(false);
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : '特效发送失败' });
    } finally { setLoading(null); }
  }

  if (authenticated === null) {
    return <main className="score-control-shell"><div className="score-control-loading"><Sparkles /> 正在连接积分系统</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="score-control-shell">
        <div className="score-control-login">
          <div className="score-control-login-mark"><ShieldCheck /></div>
          <p>QUANTUM FILM SCORE CONTROL</p><h1>积分录入后台</h1>
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
          <div><span><Zap fill="currentColor" /></span><p>量子膜积分控制台<small>省份 × 多套餐批量录入</small></p></div>
        </header>
        {notice && <div className={`score-control-notice ${notice.tone}`}>{notice.tone === 'success' && <CheckCircle2 />}{notice.message}</div>}
        {resetOpen && (
          <div className="score-reset-overlay" onClick={closeResetDialog} role="presentation">
            <div
              aria-labelledby="score-reset-title"
              aria-modal="true"
              className="score-reset-dialog"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <button aria-label="关闭全部清零确认" className="score-reset-close" disabled={loading === 'reset'} onClick={closeResetDialog} type="button">
                <X />
              </button>
              <div className="score-reset-mark"><ShieldAlert /></div>
              <h2 id="score-reset-title">彻底清零全部积分</h2>
              <p>将删除全部省份积分和录入记录，大屏分数归零。<br />此操作不可恢复。</p>
              <form onSubmit={submitReset}>
                <label htmlFor="reset-password">再次输入活动口令</label>
                <div>
                  <KeyRound />
                  <input
                    autoComplete="off"
                    autoFocus
                    id="reset-password"
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="输入活动口令后确认清零"
                    type="password"
                    value={resetPassword}
                  />
                </div>
                <div className="score-reset-actions">
                  <button disabled={loading === 'reset'} onClick={closeResetDialog} type="button">取消</button>
                  <button disabled={loading === 'reset' || !resetPassword} type="submit">
                    {loading === 'reset' ? '正在清零' : '确认全部清零'}
                  </button>
                </div>
                {resetError && <div className="score-reset-error">{resetError}</div>}
              </form>
            </div>
          </div>
        )}

        <div className="score-control-workspace">
          <section className="score-entry-card">
            <header><div><span>核心操作</span><h2>登记一张套餐积分单</h2></div><i>大屏约1秒响应</i></header>
            <form onSubmit={submitEntry}>
              <label htmlFor="province-select">选择省份</label>
              <select id="province-select" value={provinceCode} onChange={(event) => setProvinceCode(event.target.value as ProvinceCode)}>
                {PROVINCE_OPTIONS.map((province) => <option key={province.code} value={province.code}>{PROVINCE_SORT_KEYS[province.code][0].toUpperCase()} · {province.name}</option>)}
              </select>

              <fieldset className="score-package-picker">
                <legend>
                  <span>选择套餐（可同时多选）</span>
                  <small>已选 {selectedItems.length} / {PACKAGE_RULES.length} 项</small>
                </legend>
                {PACKAGE_RULES.map((item) => {
                  const selected = quantities[item.code] > 0;
                  const unitPoints = pointsByPackage.get(item.code) ?? item.points;
                  return (
                    <article className={selected ? 'active' : ''} key={item.code}>
                      <label className="score-package-toggle">
                        <input
                          checked={selected}
                          onChange={(event) => selectPackage(item.code, event.currentTarget.checked)}
                          aria-label={`选择${item.title}`}
                          type="checkbox"
                          value={item.code}
                        />
                        <span>{item.title}<small>{unitPoints}分/件</small></span>
                        <p className="score-package-desc">{item.description}</p>
                      </label>
                      {selected && (
                        <div className="score-quantity-control">
                          <button aria-label={`${item.title}减少一件`} onClick={() => setQuantity(item.code, quantities[item.code] - 1)} type="button"><Minus /></button>
                          <input aria-label={`${item.title}件数`} max={999} min={1} onChange={(event) => setQuantity(item.code, Number(event.target.value))} type="number" value={quantities[item.code]} />
                          <button aria-label={`${item.title}增加一件`} onClick={() => setQuantity(item.code, quantities[item.code] + 1)} type="button"><Plus /></button>
                        </div>
                      )}
                      {selected && <em>小计 {(unitPoints * quantities[item.code]).toLocaleString()}分</em>}
                    </article>
                  );
                })}
              </fieldset>

              <div className="score-entry-preview">
                <span>本次登记</span><strong>{selectedProvince.name} · {packageSummary || '尚未选择套餐'}</strong>
                <p>{selectedItems.map((item) => `${item.title} ${item.quantity}件`).join(' · ') || '至少选择一种套餐'}</p>
                <b>+{totalPoints.toLocaleString()}<small>分</small></b>
              </div>
              <button className="score-entry-submit" disabled={loading === 'entry' || !selectedItems.length} type="submit">
                <Zap fill="currentColor" />{loading === 'entry' ? '正在写入' : `确认登记，积分 +${totalPoints.toLocaleString()}`}
              </button>
            </form>
          </section>

          <section className="score-control-panel score-ranking-panel">
            <header>
              <h2>当前省份排名</h2>
              <button className="score-export-button" disabled={loading === 'export'} onClick={() => void exportScores()} type="button">
                <Download />{loading === 'export' ? '正在导出' : '导出明细'}
              </button>
            </header>
            <div>{snapshot?.provinces.map((province) => <article key={province.code}><b>{province.rank}</b><span>{province.name}</span><i><em style={{ width: `${Math.max(0, province.score / Math.max(snapshot.provinces[0]?.score ?? 1, 1) * 100)}%` }} /></i><strong>{province.score.toLocaleString()}</strong></article>)}</div>
          </section>

          <section className="score-control-panel score-recent-panel">
            <header>
              <h2>最近录入</h2>
              <button className="score-reset-button" disabled={loading === 'reset'} onClick={openResetDialog} type="button">
                <Eraser />全部清零
              </button>
            </header>
            <div>
              {snapshot?.recentSubmissions.map((item) => (
                <article className={item.revokedAt ? 'revoked' : ''} key={item.id}>
                  <b>{item.items.length}</b>
                  <span><strong>{item.provinceName}</strong><small>{item.items.map((detail) => `${detail.packageCode}×${detail.quantity}`).join(' · ')} · {formatTime(item.createdAt)}</small></span>
                  <em>{item.revokedAt ? '已撤销' : `+${item.totalPoints}`}</em>
                  {!item.revokedAt && <button aria-label={`撤销${item.provinceName}整单`} disabled={loading === 'revoke'} onClick={() => void revoke(item.id)}><RotateCcw />撤销</button>}
                </article>
              ))}
              {!snapshot?.recentSubmissions.length && <p className="score-control-empty">还没有积分记录，完成首次登记后会显示在这里。</p>}
            </div>
          </section>

          <section className="score-control-panel score-package-settings">
            <header><h2><Settings2 /> 套餐单件积分</h2><span>仅影响新录入</span></header>
            <div>{PACKAGE_RULES.map((item) => (
              <article key={item.code}>
                <b>{item.code}</b><span>{item.title}<small>历史积分不重算</small></span>
                <input aria-label={`${item.title}单件积分`} max={100000} min={1} onChange={(event) => setPointDrafts((current) => ({ ...current, [item.code]: event.target.value }))} type="number" value={pointDrafts[item.code]} />
                <button disabled={loading === 'package'} onClick={() => void updatePoints(item.code)} type="button"><Save />保存</button>
              </article>
            ))}</div>
          </section>
        </div>
        <section className="score-big-customer-launch">
          <div><Star fill="currentColor" /><span><strong>现场专用 · 大客户订单</strong><small>杭州保通科技实业有限公司</small></span></div>
          <button disabled={loading === 'bigCustomer'} onClick={() => void launchBigCustomer()} type="button">
            <Sparkles />{loading === 'bigCustomer' ? '正在发送' : '播放专属出场特效'}
          </button>
        </section>
      </div>
    </main>
  );
}
