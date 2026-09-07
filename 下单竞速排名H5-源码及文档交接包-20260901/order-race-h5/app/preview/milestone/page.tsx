'use client';

import { useState } from 'react';
import { MilestoneCelebration } from '@/components/order-race/milestone-celebration';

export default function MilestonePreview() {
  const [replay, setReplay] = useState(0);
  return <main style={{ position: 'fixed', inset: 0, background: '#02071d' }}>
    <MilestoneCelebration key={replay} event={{ durationMs: 3000, milestone: 100, scoreAfter: 100, provinceName: '云南省' }} />
    <button type="button" onClick={() => setReplay(value => value + 1)} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2, border: '1px solid #b47aff', borderRadius: 8, padding: '10px 24px', background: '#161035', color: 'white', cursor: 'pointer' }}>重播突破动效</button>
  </main>;
}
