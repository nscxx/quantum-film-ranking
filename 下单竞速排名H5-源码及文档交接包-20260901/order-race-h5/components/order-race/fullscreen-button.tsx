'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '@/hooks/use-fullscreen';

export function FullscreenButton() {
  const { active, supported, toggle } = useFullscreen();
  const [idleHidden, setIdleHidden] = useState(false);

  useEffect(() => {
    if (!active) {
      setIdleHidden(false);
      return;
    }

    let timer = window.setTimeout(() => setIdleHidden(true), 2200);
    const reveal = () => {
      setIdleHidden(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdleHidden(true), 2200);
    };

    window.addEventListener('mousemove', reveal);
    window.addEventListener('pointerdown', reveal);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('pointerdown', reveal);
    };
  }, [active]);

  if (!supported) return null;

  return (
    <button
      aria-label={active ? '退出全屏' : '进入全屏'}
      className={`quantum-fullscreen-btn${idleHidden ? ' is-idle' : ''}`}
      onClick={toggle}
      title={active ? '退出全屏（Esc）' : '进入全屏，隐藏浏览器标题栏和地址栏'}
      type="button"
    >
      {active ? <Minimize2 /> : <Maximize2 />}
      <span>{active ? '退出' : '全屏'}</span>
    </button>
  );
}
