import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { act, createElement as h, StrictMode, Children, useEffect } from 'react';
import { renderToString } from 'react-dom/server';

const window = new Window({
  url: 'http://localhost',
  settings: { disableIframePageLoading: true, disableCSSFileLoading: true },
});

for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'Event', 'KeyboardEvent', 'PointerEvent', 'localStorage']) {
  globalThis[key] = key === 'window' ? window : window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

// Preserve component lifecycles while replacing Three host objects with fragments.
const sceneComponents = new Map();
const sceneResources = new Set();
function SceneHost({ children, map, material }) {
  useEffect(() => {
    if (map) sceneResources.add(map);
    if (material) sceneResources.add(material);
  }, [map, material]);
  return renderScene(children);
}
function renderScene(children) {
  return Children.map(children, child => {
    if (!child || typeof child !== 'object') return child;
    if (typeof child.type !== 'function') return h(SceneHost, child.props);
    if (!sceneComponents.has(child.type)) {
      const Component = child.type;
      sceneComponents.set(Component, props => renderScene(Component(props)));
    }
    return h(sceneComponents.get(child.type), child.props);
  });
}
// Exercise the real Scene hooks without requiring a GPU renderer.
mock.module('@react-three/fiber', () => ({
  Canvas: ({ children }) => renderScene(children),
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

test('hero releases owned textures and shared bracket materials on FX toggles and unmount', async () => {
  const originalComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText: text => ({ width: text.length * 24 }),
    clearRect() {}, strokeRect() {}, fillText() {},
  });
  try {
    await mount(h(HeroScene, { full: false }));
    const root = roots.at(-1);
    const render = full => act(() => root.render(h(StrictMode, null, h(HeroScene, { full }))));
    for (let cycle = 0; cycle < 4; cycle++) {
      sceneResources.clear();
      await render(true);
      const resources = [...sceneResources];
      expect(resources.filter(r => r.isCanvasTexture)).toHaveLength(5);
      // Each corner's two bars share one material.
      expect(resources.filter(r => r.isMeshBasicMaterial)).toHaveLength(2);
      const disposals = resources.map(resource => spyOn(resource, 'dispose'));
      await render(true);
      for (const dispose of disposals) expect(dispose).not.toHaveBeenCalled();
      if (cycle === 3) await act(() => roots.pop().unmount());
      else await render(false);
      for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
    }
  } finally {
    if (originalComputedStyle) globalThis.getComputedStyle = originalComputedStyle;
    else delete globalThis.getComputedStyle;
    sceneResources.clear();
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

const lenisInstances = [];
mock.module('lenis', () => ({ default: class {
  constructor() {
    this.isStopped = false;
    this.stop = mock(() => { this.isStopped = true; });
    this.start = mock(() => { this.isStopped = false; });
    this.destroy = mock(() => {});
    lenisInstances.push(this);
  }
} }));
mock.module('next/dynamic', () => ({ default: () => () => h('canvas') }));
const { default: SmoothScroll } = await import('../components/motion/SmoothScroll');
const { default: Cursor } = await import('../components/motion/Cursor');
const { default: Parallax } = await import('../components/motion/Parallax');
const { default: Magnetic } = await import('../components/motion/Magnetic');
const { default: FloatingLetters } = await import('../components/motion/FloatingLetters');
const { LazyHeroScene, LazyPhotoPile } = await import('../components/motion/LazyScene');

for (const initiallyStopped of [false, true]) {
  for (const closeVia of ['cancel', 'button', 'unmount']) {
    test(`gallery restores Lenis state (stopped=${initiallyStopped}, close=${closeVia})`, async () => {
      const host = await mount(h('div', null, h(SmoothScroll), h(Gallery, {
        photos: [1, 2].map(i => ({ src: `/photo${i}.webp`, width: 100, height: 100, blurDataURL: '' })),
        albumTitle: 'Test',
      })));
      const lenis = lenisInstances.at(-1);
      if (initiallyStopped) lenis.stop();
      await act(() => host.querySelector('button').click());
      expect(lenis.isStopped).toBe(true);
      await act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
      expect(lenis.isStopped).toBe(true);
      expect(lenis.start).not.toHaveBeenCalled();
      await act(() => {
        if (closeVia === 'cancel') host.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
        else if (closeVia === 'button') host.querySelector('dialog button').click();
        // Remove only the gallery so its cleanup must restore the surviving Lenis.
        else roots.at(-1).render(h(StrictMode, null, h('div', null, h(SmoothScroll))));
      });
      expect(lenis.isStopped).toBe(initiallyStopped);
      expect(lenis.start).toHaveBeenCalledTimes(initiallyStopped ? 0 : 1);
    });
  }
}

test('Lenis created after motion is enabled stays stopped until the gallery closes', async () => {
  const listeners = new Set();
  const query = {
    matches: true,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  spyOn(window, 'matchMedia').mockReturnValue(query);
  const host = await mount(h('div', null, h(SmoothScroll), h(Gallery, {
    photos: [{ src: '/photo.webp', width: 100, height: 100, blurDataURL: '' }], albumTitle: 'Test',
  })));
  await act(() => host.querySelector('button').click());
  for (let cycle = 0; cycle < 2; cycle++) {
    await act(() => { query.matches = false; for (const listener of listeners) listener(); });
    expect(lenisInstances.at(-1).isStopped).toBe(true);
    if (cycle === 0) {
      await act(() => { query.matches = true; for (const listener of listeners) listener(); });
      expect(lenisInstances.at(-1).destroy).toHaveBeenCalledTimes(1);
      expect(lenisInstances.at(-1).start).not.toHaveBeenCalled();
    }
  }
  const lenis = lenisInstances.at(-1);
  await act(() => host.querySelector('dialog button').click());
  expect(lenis.isStopped).toBe(false);
});

const motionGlobals = ['requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight'];
const originalMotionGlobals = motionGlobals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
afterEach(() => {
  motionGlobals.forEach((key, i) => {
    if (originalMotionGlobals[i]) Object.defineProperty(globalThis, key, originalMotionGlobals[i]);
    else delete globalThis[key];
  });
});

for (const initiallyReduced of [false, true]) {
  test(`live reduced motion stops/restarts effects and releases subscriptions (initial reduce=${initiallyReduced})`, async () => {
    const listeners = new Set();
    const query = {
      matches: initiallyReduced,
      addEventListener: (type, fn) => { if (type === 'change') listeners.add(fn); },
      removeEventListener: (type, fn) => { if (type === 'change') listeners.delete(fn); },
    };
    spyOn(window, 'matchMedia').mockImplementation(q => q.includes('prefers-reduced-motion') ? query : { matches: true });
    const frames = new Map();
    let frameId = 0;
    globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    globalThis.innerWidth = 800;
    globalThis.innerHeight = 600;
    const targets = [[window, 'pointermove'], [document, 'pointerout'], [window, 'scroll']];
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
    lenisInstances.length = 0;
    localStorage.setItem('motion-fx', '1');
    const host = await mount(h(MotionProvider, null,
      h(SmoothScroll), h(Cursor), h(LazyHeroScene),
      h(LazyPhotoPile, { prints: [{ src: '/test.webp', width: 1, height: 1, album: 'test', title: 'Test' }] }),
      h(Parallax, { className: 'test-parallax' }, 'Photo'),
      h(Magnetic, { className: 'test-magnetic' }, 'Link'),
      h(FloatingLetters, { className: 'test-letters', text: 'Test' }),
      h(Reveal, null, 'Visible content'),
    ));
    await act(() => { for (const observer of observers) observer.callback([{ isIntersecting: true }]); });
    expect(listeners.size).toBe(8);
    expect(host.querySelectorAll('canvas').length).toBe(initiallyReduced ? 0 : 2);
    expect(lenisInstances.length).toBe(initiallyReduced ? 0 : 1);
    const change = async reduced => {
      await act(() => {
        query.matches = reduced;
        for (const listener of listeners) listener();
      });
    };
    for (let cycle = 0; cycle < 3; cycle++) {
      await change(false);
      expect(host.querySelectorAll('canvas').length).toBe(2);
      expect(host.querySelector('.vf-cursor')).not.toBeNull();
      expect(document.body.classList.contains('has-custom-cursor')).toBe(true);
      expect(active.map(s => s.size)).toEqual([2, 1, 1]);
      expect(lenisInstances.at(-1).destroy).not.toHaveBeenCalled();
      host.querySelector('.test-magnetic').dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 100 }));
      const pending = [...frames.entries()];
      for (const [id, callback] of pending) { frames.delete(id); callback(100); }
      expect(host.querySelector('.test-magnetic span').style.transform).not.toBe('');
      expect(host.querySelector('.test-letters span').style.transform).not.toBe('');
      await change(true);
      expect(host.querySelectorAll('canvas').length).toBe(0);
      expect(host.querySelector('.vf-cursor')).toBeNull();
      expect(document.body.classList.contains('has-custom-cursor')).toBe(false);
      expect(active.map(s => s.size)).toEqual([0, 0, 0]);
      expect(frames.size).toBe(0);
      for (const instance of lenisInstances) expect(instance.destroy).toHaveBeenCalledTimes(1);
      for (const selector of ['.test-parallax', '.test-magnetic span', '.test-letters span']) {
        expect(host.querySelector(selector).style.transform).toBe('');
      }
      host.querySelector('.test-magnetic').dispatchEvent(new PointerEvent('pointermove'));
      expect(frames.size).toBe(0);
      expect(host.querySelector('.reveal').classList.contains('reveal-ready')).toBe(false);
    }
    await change(false);
    await act(() => roots.pop().unmount());
    expect(listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(active.map(s => s.size)).toEqual([0, 0, 0]);
    expect(document.body.classList.contains('has-custom-cursor')).toBe(false);
    for (const instance of lenisInstances) expect(instance.destroy).toHaveBeenCalledTimes(1);
    for (const observer of observers) expect(observer.disconnect).toHaveBeenCalled();
  });
}
