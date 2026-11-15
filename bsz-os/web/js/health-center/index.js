import { mountHealthCenterView, ziboEvents } from './view.js';

let activeHealthCenter = null;
let returnPoint = null;
let returnMountPending = false;
let stylesheet = null;
let mounts = 0;

export function healthCenterBack() {
  if (activeHealthCenter && returnPoint) {
    activeHealthCenter.restore(returnPoint);
    returnPoint = null;
    return true;
  }
  if (activeHealthCenter && returnMountPending) {
    returnMountPending = false;
    return true;
  }
  if (activeHealthCenter?.back()) return true;
  if (returnPoint && typeof window.__bszOpenPageById === 'function') {
    window.__bszOpenPageById('health');
    return true;
  }
  return false;
}

function publishBackHook() {
  window.__bszHealthCenterBack = healthCenterBack;
  window.BZG = window.BZG || {};
  window.BZG.ai = window.BZG.ai || {};
  window.BZG.healthCenter = { ...(window.BZG.healthCenter || {}), ziboEvents };
}

export function mountHealthCenter(root) {
  publishBackHook();
  if (!stylesheet || !stylesheet.isConnected) {
    stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./health-center.css', import.meta.url).href;
    stylesheet.dataset.healthCenterStyle = '';
    document.head.append(stylesheet);
  }

  const initialPoint = returnPoint;
  const instance = mountHealthCenterView(root, {
    openAssistant(point) {
      returnPoint = point;
      window.BZG.ai.healthCenterBack = healthCenterBack;
    },
    initialPoint,
  });
  returnPoint = null;
  returnMountPending = !!initialPoint;
  mounts++;
  activeHealthCenter = instance;
  return () => {
    instance.cleanup();
    if (activeHealthCenter === instance) activeHealthCenter = null;
    if (returnMountPending) returnMountPending = false;
    mounts = Math.max(0, mounts - 1);
    if (!mounts && stylesheet?.isConnected) stylesheet.remove();
  };
}
