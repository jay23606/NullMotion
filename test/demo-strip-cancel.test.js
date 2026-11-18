import test from 'node:test';
import assert from 'node:assert/strict';

// Runs the real demo.mjs against a DOM stub (same shim as slider-valuetext.test.js) and
// drives the #strip listeners directly: a gesture that ends with pointercancel or
// lostpointercapture must stop scrubbing, so a later pointermove with no button held
// leaves the film where it was.
const nodes = new Map();
function makeNode(name) {
  const attrs = new Map(), listeners = {};
  const base = {
    name, style: { setProperty() {}, getPropertyValue: () => '' }, dataset: {}, textContent: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(key, value) { attrs.set(key, String(value)); },
    getAttribute(key) { return attrs.has(key) ? attrs.get(key) : null; },
    removeAttribute(key) { attrs.delete(key); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 60, right: 100, bottom: 60 }),
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    removeEventListener() {},
    fire(type, init = {}) {
      const event = { target: base, pointerId: 1, clientX: 0, preventDefault() {}, stopPropagation() {}, ...init };
      for (const handler of listeners[type] || []) handler(event);
    },
  };
  return new Proxy(base, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop in target) return target[prop];
      if (prop === 'valueOf') return () => 0;
      if (prop === 'toString') return () => '';
      return () => makeNode(String(prop));
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}
function byId(id) {
  if (!nodes.has(id)) nodes.set(id, makeNode(id));
  return nodes.get(id);
}
globalThis.document = {
  getElementById: byId,
  querySelector: () => makeNode('query'),
  querySelectorAll: () => [],
  createElement: tag => makeNode(tag),
  addEventListener() {}, removeEventListener() {},
  body: makeNode('body'), documentElement: makeNode('html'), activeElement: null,
};
globalThis.window = globalThis;
globalThis.history = { replaceState() {}, pushState() {} };
globalThis.location = { href: 'http://127.0.0.1:4343/', origin: 'http://127.0.0.1:4343', pathname: '/', search: '', hash: '' };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.devicePixelRatio = 1;
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const callable = () => new Proxy(function () {}, { get: (t, p) => (typeof p === 'symbol' || p === 'then' ? undefined : p === 'valueOf' ? () => 0 : p === 'toString' ? () => '' : callable()), apply: () => callable() });
globalThis.gsap = callable();
globalThis.fetch = async url => url === '/api/references'
  ? { ok: true, json: async () => ({ references: [{ id: 'ref1', name: 'Reference', duration: 200, segments: [], uploaded: false, src: '/references/ref1.mp4', poster: '/references/ref1.jpg' }] }) }
  : (() => { throw new Error('offline'); })();

await import('../public/demo.mjs');
await new Promise(resolve => setTimeout(resolve, 0));
const strip = byId('strip');
const video = byId('final-video');

for (const endType of ['pointercancel', 'lostpointercapture']) {
  test(`strip drag ends on ${endType}`, () => {
    strip.fire('pointerdown', { clientX: 10 });
    strip.fire('pointermove', { clientX: 30 });
    strip.fire(endType, { clientX: 30 });
    const before = video.currentTime;
    strip.fire('pointermove', { clientX: 80 });
    assert.equal(video.currentTime, before,
      `strip drag is not ended on ${endType}: pointermove after the gesture still scrubs`);
  });
}

test('strip drag still follows the pointer until pointerup', () => {
  strip.fire('pointerdown', { clientX: 10 });
  const start = video.currentTime;
  strip.fire('pointermove', { clientX: 90 });
  assert.notEqual(video.currentTime, start, 'strip drag should scrub while the button is held');
  strip.fire('pointerup', { clientX: 90 });
});
