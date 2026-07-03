function syncFullscreenState() {
  const isFullscreen = Boolean(document.fullscreenElement);
  elements.fullscreenBtn.textContent = isFullscreen ? 'exit fullscreen' : 'full screen';
  elements.fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
}

function fullscreenTarget() {
  if (typeof elements.body.requestFullscreen === 'function') return elements.body;
  if (typeof document.documentElement.requestFullscreen === 'function') return document.documentElement;
  return null;
}

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) {
    setStatus(STATUS.fullscreenUnavailable);
    return;
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      const target = fullscreenTarget();
      if (!target) {
        setStatus(STATUS.fullscreenUnavailable);
        return;
      }
      await target.requestFullscreen();
    }
    syncFullscreenState();
    closePanel({ restoreFocus: false });
  } catch {
    setStatus(STATUS.fullscreenBlocked);
  }
}
