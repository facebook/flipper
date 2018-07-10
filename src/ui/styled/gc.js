/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Tracker, RulesToClass} from './index.js';
import type {StyleSheet} from './sheet.js';

const invariant = require('invariant');

export class GarbageCollector {
  constructor(sheet: StyleSheet, tracker: Tracker, rulesToClass: RulesToClass) {
    this.sheet = sheet;
    this.tracker = tracker;

    // used to keep track of what classes are actively in use
    this.usedClasses = new Map();

    // classes to be removed, we put this in a queue and perform it in bulk rather than straight away
    // since by the time the next tick happens this style could have been reinserted
    this.classRemovalQueue = new Set();

    this.rulesToClass = rulesToClass;
  }

  tracker: Tracker;
  sheet: StyleSheet;
  usedClasses: Map<string, number>;
  garbageTimer: ?TimeoutID;
  classRemovalQueue: Set<string>;
  rulesToClass: RulesToClass;

  hasQueuedCollection(): boolean {
    return Boolean(this.garbageTimer);
  }

  getReferenceCount(key: string): number {
    return this.usedClasses.get(key) || 0;
  }

  // component has been mounted so make sure it's being depended on
  registerClassUse(name: string) {
    const count = this.usedClasses.get(name) || 0;
    this.usedClasses.set(name, count + 1);
    if (this.classRemovalQueue.has(name)) {
      this.classRemovalQueue.delete(name);

      if (this.classRemovalQueue.size === 0) {
        this.haltGarbage();
      }
    }
  }

  // component has been unmounted so remove it's dependencies
  deregisterClassUse(name: string) {
    let count = this.usedClasses.get(name);
    if (count == null) {
      return;
    }

    count--;
    this.usedClasses.set(name, count);

    if (count === 0) {
      this.classRemovalQueue.add(name);
      this.scheduleGarbage();
    }
  }

  scheduleGarbage() {
    if (this.garbageTimer != null) {
      return;
    }

    this.garbageTimer = setTimeout(() => {
      this.collectGarbage();
    }, 2000);
  }

  haltGarbage() {
    if (this.garbageTimer) {
      clearTimeout(this.garbageTimer);
      this.garbageTimer = null;
    }
  }

  getCollectionQueue(): Array<string> {
    return Array.from(this.classRemovalQueue);
  }

  collectGarbage() {
    this.haltGarbage();
    for (const name of this.classRemovalQueue) {
      const trackerInfo = this.tracker.get(name);
      invariant(trackerInfo != null, 'trying to remove unknown class');

      const {rules} = trackerInfo;
      this.rulesToClass.delete(rules);

      this.sheet.delete(name);
      this.tracker.delete(name);
      this.usedClasses.delete(name);
    }
    this.classRemovalQueue.clear();
  }

  flush() {
    this.haltGarbage();
    this.classRemovalQueue.clear();
    this.usedClasses.clear();
  }
}
