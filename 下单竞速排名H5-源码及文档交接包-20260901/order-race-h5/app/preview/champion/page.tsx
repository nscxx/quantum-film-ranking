'use client';

import { useEffect, useState } from 'react';
import { ChampionCelebration } from '@/components/order-race/champion-celebration';
import { CHAMPION_DURATION_MS } from '@/lib/order-race/celebrations';
import styles from './preview.module.css';

const chapters = [
  { name: '金龙入场', time: .04 }, { name: '冠军揭晓', time: .16 },
  { name: '第二圈', time: .42 }, { name: '金光定格', time: .8 },
];

export default function ChampionPreview() {
  const [replay, setReplay] = useState(0);
  const [province, setProvince] = useState('上海市');
  const [slow, setSlow] = useState(false);
  const [loop, setLoop] = useState(true);
  const [seek, setSeek] = useState<number>();
  const [progress, setProgress] = useState(0);
  const durationMs = CHAMPION_DURATION_MS * (slow ? 2 : 1);
  useEffect(() => {
    if (!loop || seek !== undefined) return;
    const timer = window.setTimeout(() => setReplay(value => value + 1), durationMs + 2000);
    return () => window.clearTimeout(timer);
  }, [loop, seek, durationMs, replay, province]);
  function restart() { setSeek(undefined); setProgress(0); setReplay(value => value + 1); }
  return <main className={styles.preview}>
    <ChampionCelebration key={province + ':' + replay + ':' + durationMs} event={{ durationMs, provinceName: province }}
      hold seek={seek} onProgress={setProgress} />
    <div className={styles.panel}>
      <nav className={styles.chapters} aria-label="动画段落">
        {chapters.map(chapter => <button type="button" key={chapter.name} onClick={() => setSeek(chapter.time)}>{chapter.name}</button>)}
      </nav>
      <div className={styles.controls} aria-label="冠军动效预览控制">
        <button type="button" onClick={restart}>↻ 重播 20 秒</button>
        <button type="button" onClick={() => seek === undefined ? setSeek(progress) : restart()}>{seek === undefined ? 'Ⅱ 定格' : '▶ 从头播放'}</button>
        <label className={styles.timeline}>
          <input aria-label="冠军动画时间轴" type="range" min="0" max="1000" value={Math.round((seek ?? progress) * 1000)}
            onChange={event => setSeek(Number(event.target.value) / 1000)} />
          <span>{((seek ?? progress) * (CHAMPION_DURATION_MS / 1000)).toFixed(1)} / {CHAMPION_DURATION_MS / 1000}s</span>
        </label>
        <label className={styles.toggle}><input type="checkbox" checked={slow} onChange={event => { setSlow(event.target.checked); setSeek(undefined); }} />0.5×</label>
        <label className={styles.toggle}><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} />循环</label>
        <select aria-label="冠军省份" value={province} onChange={event => { setProvince(event.target.value); setSeek(undefined); }}>
          {['上海市', '云南省', '广东省', '内蒙古自治区', '新疆维吾尔自治区'].map(name => <option key={name}>{name}</option>)}
        </select>
      </div>
    </div>
  </main>;
}
