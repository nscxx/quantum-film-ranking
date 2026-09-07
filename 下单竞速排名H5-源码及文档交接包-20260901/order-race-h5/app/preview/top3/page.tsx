'use client';

import { useEffect, useState } from 'react';
import { TopThreeCelebration } from '@/components/order-race/top3-celebration';
import styles from './preview.module.css';

export default function TopThreePreview() {
  const [replay, setReplay] = useState(0);
  const [province, setProvince] = useState('云南省');
  const [slow, setSlow] = useState(false);
  const [loop, setLoop] = useState(true);
  const [seek, setSeek] = useState<number>();
  const [progress, setProgress] = useState(0);
  const durationMs = slow ? 10000 : 5000;

  useEffect(() => {
    if (!loop || seek !== undefined) return;
    const timer = window.setTimeout(() => setReplay(value => value + 1), durationMs + 1800);
    return () => window.clearTimeout(timer);
  }, [loop, seek, durationMs, replay, province]);

  function restart() { setSeek(undefined); setProgress(0); setReplay(value => value + 1); }
  return <main className={styles.preview}>
    <TopThreeCelebration key={province + ':' + replay + ':' + durationMs}
      event={{ durationMs, provinceName: province, rankAfter: 3 }}
      hold seek={seek} onProgress={setProgress} />
    <div className={styles.controls} aria-label="前三动效预览控制">
      <button type="button" onClick={restart}>↻ 重播</button>
      <button type="button" onClick={() => seek === undefined ? setSeek(progress) : restart()}>{seek === undefined ? 'Ⅱ 定格' : '▶ 从头播放'}</button>
      <label className={styles.timeline}>
        <span>进度</span>
        <input type="range" aria-label="动画时间轴" min="0" max="1000" value={Math.round((seek ?? progress) * 1000)}
          onChange={event => setSeek(Number(event.target.value) / 1000)} />
      </label>
      <label className={styles.toggle}><input type="checkbox" checked={slow} onChange={event => { setSlow(event.target.checked); setSeek(undefined); }} />0.5× 慢放</label>
      <label className={styles.toggle}><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} />循环</label>
      <select aria-label="预览省份" value={province} onChange={event => { setProvince(event.target.value); setSeek(undefined); }}>
        {['云南省', '广东省', '黑龙江省', '内蒙古自治区', '新疆维吾尔自治区'].map(name => <option key={name}>{name}</option>)}
      </select>
    </div>
  </main>;
}
