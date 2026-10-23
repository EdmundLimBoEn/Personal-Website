import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { act, createElement as h, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

const window = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'Event', 'KeyboardEvent', 'PointerEvent', 'localStorage']) {
  globalThis[key] = key === 'window' ? window : window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

// Exercise the real Scene hooks without requiring a GPU renderer.
mock.module('@react-three/fiber', () => ({
  Canvas: ({ children }) => { children.type(children.props); return null; },
  useThree: () => ({ viewport: { width: 8, height: 6 }, size: { width: 800, height: 600 } }),
  useFrame: () => {},
}));
mock.module('next/image', () => ({ default: ({ src, alt }) => h('img', { src, alt }) }));
const { default: HeroScene } = await import('../components/scenes/HeroScene');
const { MotionProvider, FxToggle } = await import('../components/motion/MotionMode');
const { default: Reveal } = await import('../components/motion/Reveal');
const { default: Gallery } = await import('../components/Gallery');
let roots = [];
let observers = [];
class Observer {
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe() {}
  disconnect = mock(() => {});
}
window.IntersectionObserver = globalThis.IntersectionObserver = Observer;
async function mount(element) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(() => root.render(h(StrictMode, null, element)));
  return host;
}
afterEach(async () => {
  for (const root of roots) await act(() => root.unmount());
  roots = [];
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  globalThis.localStorage = window.localStorage;
  localStorage.clear();
  observers = [];
  mock.restore();
});

test('hero has no render-time listeners and releases all listeners on five StrictMode remounts', async () => {
  const targets = [[window, 'pointermove'], [window, 'pointerdown'], [document, 'pointerout']];
  const active = targets.map(() => new Set());
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    spyOn(target, 'addEventListener').mockImplementation((type, fn, options) => {
      targets.forEach(([t, name], i) => { if (t === target && name === type) active[i].add(fn); });
      add(type, fn, options);
    });
    spyOn(target, 'removeEventListener').mockImplementation((type, fn, options) => {
      targets.forEach(([t, name], i) => { if (t === target && name === type) active[i].delete(fn); });
      remove(type, fn, options);
    });
  }
  renderToString(h(HeroScene));
  expect(active.map(s => s.size)).toEqual([0, 0, 0]);
  for (let i = 0; i < 5; i++) {
    await mount(h(HeroScene));
    expect(active.map(s => s.size)).toEqual([1, 1, 1]);
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 300 }));
    await act(() => roots.pop().unmount());
    expect(active.map(s => s.size)).toEqual([0, 0, 0]);
  }
});

for (const mode of ['read', 'write', 'both']) {
  test(`FX works with denied storage ${mode}`, async () => {
    const deny = () => { throw new Error('Storage denied'); };
    globalThis.localStorage = {
      getItem: mode !== 'write' ? deny : () => null,
      setItem: mode !== 'read' ? deny : () => {},
    };
    const host = await mount(h(MotionProvider, null, h(FxToggle)));
    const toggle = host.querySelector('button');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await act(() => toggle.click());
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await act(() => toggle.click());
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
}

test('FX initializes from storage and persists one write per committed toggle in StrictMode', async () => {
  localStorage.setItem('motion-fx', '1');
  const writes = mock((...args) => window.localStorage.setItem(...args));
  globalThis.localStorage = {
    getItem: key => window.localStorage.getItem(key),
    setItem: writes,
  };
  const host = await mount(h(MotionProvider, null, h(FxToggle)));
  expect(host.querySelector('button').getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem('motion-fx')).toBe('1');
  writes.mockClear();
  await act(() => host.querySelector('button').click());
  expect(localStorage.getItem('motion-fx')).toBe('0');
  expect(writes).toHaveBeenCalledTimes(1);
});

function addRevealStyles() {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const style = document.createElement('style');
  style.textContent = css.slice(css.indexOf('/* ---- scroll-triggered reveal'), css.indexOf('/* ---- viewfinder cursor'));
  document.body.append(style);
}

test('server-rendered reveal content is visible before client initialization', () => {
  addRevealStyles();
  const host = document.createElement('div');
  host.innerHTML = renderToString(h(Reveal, null, 'Visible content'));
  document.body.append(host);
  expect(window.getComputedStyle(host.firstChild).opacity).toBe('1');
});

test('reveal arms only on mount, reveals on intersection, and disconnects on unmount', async () => {
  addRevealStyles();
  const host = await mount(h(Reveal, null, 'Content'));
  const el = host.firstChild;
  expect(window.getComputedStyle(el).opacity).toBe('0');
  const observer = observers.at(-1);
  observer.callback([{ isIntersecting: true }]);
  expect(window.getComputedStyle(el).opacity).toBe('1');
  expect(observer.disconnect).toHaveBeenCalledTimes(1);
  await act(() => roots.pop().unmount());
  expect(observer.disconnect).toHaveBeenCalledTimes(2);
  expect(el.classList.contains('reveal-ready')).toBe(false);
});

test('gallery opens a native modal, keeps it open when stepping, and restores focus/scroll on close', async () => {
  const show = spyOn(HTMLDialogElement.prototype, 'showModal');
  const close = spyOn(HTMLDialogElement.prototype, 'close');
  const photos = [1, 2].map(i => ({ src: `/photo${i}.webp`, width: 100, height: 100, blurDataURL: '' }));
  const host = await mount(h(Gallery, { photos, albumTitle: 'Test' }));
  const opener = host.querySelector('button');
  document.body.style.overflow = 'clip';
  opener.focus();
  await act(() => opener.click());
  const dialog = host.querySelector('dialog');
  expect(dialog?.open).toBe(true);
  expect(show).toHaveBeenCalledTimes(1);
  expect(document.body.style.overflow).toBe('hidden');
  dialog.querySelector('button').focus();
  await act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
  expect(dialog.textContent).toContain('02/02');
  expect(show).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  await act(() => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
  expect(host.querySelector('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.body.style.overflow).toBe('clip');
  expect(close).toHaveBeenCalledTimes(1);
});
