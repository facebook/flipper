/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Tracker} from '../index.js';
import {GarbageCollector} from '../gc.js';
import {StyleSheet} from '../sheet.js';

function createGC(): {|
  gc: GarbageCollector,
  tracker: Tracker,
|} {
  const sheet = new StyleSheet();
  const tracker = new Map();
  const rulesToClass = new WeakMap();

  const gc = new GarbageCollector(sheet, tracker, rulesToClass);
  return {gc, tracker};
}

test('register classes to be garbage collected when no references exist', () => {
  const {gc} = createGC();

  gc.registerClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual([]);

  gc.deregisterClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual(['foo']);
});

test('cancel garbage collection for classes used before actual collection happens', () => {
  const {gc} = createGC();

  gc.registerClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual([]);

  gc.deregisterClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual(['foo']);

  gc.registerClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual([]);
});

test('garbage collector removes unreferenced classes', () => {
  const {gc, tracker} = createGC();

  tracker.set('foo', {
    displayName: 'foo',
    namespace: '',
    selector: '',
    style: {},
    rules: {},
  });

  gc.registerClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual([]);

  gc.deregisterClassUse('foo');
  expect(gc.getCollectionQueue()).toEqual(['foo']);
  expect(gc.hasQueuedCollection()).toBe(true);
  expect(tracker.has('foo')).toBe(true);

  gc.collectGarbage();
  expect(gc.hasQueuedCollection()).toBe(false);
  expect(gc.getCollectionQueue()).toEqual([]);
  expect(tracker.has('foo')).toBe(false);
});

test('properly tracks reference counts', () => {
  const {gc} = createGC();

  gc.registerClassUse('foo');
  gc.registerClassUse('foo');
  gc.registerClassUse('bar');
  expect(gc.getReferenceCount('foo')).toBe(2);
  expect(gc.getReferenceCount('bar')).toBe(1);

  gc.deregisterClassUse('bar');
  expect(gc.getReferenceCount('bar')).toBe(0);

  gc.deregisterClassUse('foo');
  expect(gc.getReferenceCount('foo')).toBe(1);

  gc.deregisterClassUse('foo');
  expect(gc.getReferenceCount('foo')).toBe(0);
});

test("gracefully handle deregistering classes we don't have a count for", () => {
  const {gc} = createGC();
  gc.deregisterClassUse('not-tracking');
});

test('only halt garbage collection if there is nothing left in the queue', () => {
  const {gc} = createGC();

  gc.registerClassUse('foo');
  expect(gc.hasQueuedCollection()).toBe(false);

  gc.deregisterClassUse('foo');
  expect(gc.hasQueuedCollection()).toBe(true);

  gc.registerClassUse('bar');
  expect(gc.hasQueuedCollection()).toBe(true);

  gc.deregisterClassUse('bar');
  expect(gc.hasQueuedCollection()).toBe(true);

  gc.registerClassUse('bar');
  expect(gc.hasQueuedCollection()).toBe(true);

  gc.registerClassUse('foo');
  expect(gc.hasQueuedCollection()).toBe(false);
});

test('ensure garbage collection happens', () => {
  const {gc} = createGC();

  gc.registerClassUse('foo');
  gc.deregisterClassUse('foo');
  expect(gc.hasQueuedCollection()).toBe(true);
  expect(gc.getCollectionQueue()).toEqual(['foo']);

  jest.runAllTimers();
  expect(gc.hasQueuedCollection()).toBe(false);
  expect(gc.getCollectionQueue()).toEqual([]);
});

test('flush', () => {
  const {gc} = createGC();

  gc.registerClassUse('bar');
  gc.deregisterClassUse('bar');
  expect(gc.getCollectionQueue()).toEqual(['bar']);
  expect(gc.getReferenceCount('bar')).toBe(0);

  gc.registerClassUse('foo');
  expect(gc.getReferenceCount('foo')).toBe(1);

  gc.flush();
  expect(gc.getCollectionQueue()).toEqual([]);
  expect(gc.getReferenceCount('foo')).toBe(0);
});
