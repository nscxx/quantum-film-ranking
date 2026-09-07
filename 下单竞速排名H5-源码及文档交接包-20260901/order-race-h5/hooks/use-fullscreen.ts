'use client';

import { useCallback, useEffect, useState } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenHost = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement() {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const host = document.documentElement as FullscreenHost;
  return Boolean(host.requestFullscreen || host.webkitRequestFullscreen);
}

export async function enterFullscreen() {
  if (getFullscreenElement() || !isFullscreenSupported()) return;
  const host = document.documentElement as FullscreenHost;
  try {
    if (host.requestFullscreen) {
      await host.requestFullscreen({ navigationUI: 'hide' });
      return;
    }
    await host.webkitRequestFullscreen?.();
  } catch {
    // Browser may reject if not triggered by a user gesture, or if the user denies the prompt.
  }
}

export async function exitFullscreen() {
  if (!getFullscreenElement()) return;
  const doc = document as FullscreenDocument;
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    await doc.webkitExitFullscreen?.();
  } catch {
    // Ignore; Esc still exits in supporting browsers.
  }
}

export async function toggleFullscreen() {
  if (getFullscreenElement()) {
    await exitFullscreen();
    return;
  }
  await enterFullscreen();
}

export function useFullscreen() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isFullscreenSupported());
    const sync = () => setActive(Boolean(getFullscreenElement()));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  const toggle = useCallback(() => {
    void toggleFullscreen();
  }, []);

  const enter = useCallback(() => {
    void enterFullscreen();
  }, []);

  return { active, supported, toggle, enter };
}
