'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const main = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');

function handlerBlock(eventName) {
  const start = main.indexOf("win.on('" + eventName + "'");
  assert.ok(start > 0, 'missing ' + eventName);
  const next = main.indexOf('win.on(', start + 10);
  return main.slice(start, next > start ? next : start + 1200);
}

test('minimize handler keeps intentional flag until restore', () => {
  const block = handlerBlock('minimize');
  assert.doesNotMatch(block, /consumeMainWindowMinimizeIntent\s*\(/);
  assert.match(block, /armMainWindowMinimizeIntent\(win, 'minimize-event-fallback'\)/);
  assert.doesNotMatch(block, /restoreUnexpectedMainWindowMinimize\(win, 'minimize-event'\)/);
  const restore = handlerBlock('restore');
  assert.match(restore, /clearMainWindowMinimizeIntent\s*\(/);
});

test('shouldRestore respects intentional minimize flag', () => {
  function shouldRestore(win) {
    if (win.__mineradioIntentionalMinimize === true) return false;
    return win.isMinimized === true;
  }
  assert.equal(shouldRestore({ __mineradioIntentionalMinimize: true, isMinimized: true }), false);
  assert.equal(shouldRestore({ __mineradioIntentionalMinimize: false, isMinimized: true }), true);
});
