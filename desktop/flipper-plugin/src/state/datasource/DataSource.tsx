/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  sortedIndexBy,
  sortedLastIndexBy,
  property,
  sortBy as lodashSort,
} from 'lodash';

// TODO: support better minification
// TODO: separate views from datasource to be able to support multiple transformation simultanously
// TODO: expose interface with public members only
// TODO: replace forEach with faster for loops
// TODO: delete & unset operation
// TODO: support listener for input events?

type ExtractKeyType<T, KEY extends keyof T> = T[KEY] extends string
  ? string
  : T[KEY] extends number
  ? number
  : never;

type AppendEvent<T> = {
  type: 'append';
  entry: Entry<T>;
};
type UpdateEvent<T> = {
  type: 'update';
  entry: Entry<T>;
  oldValue: T;
  oldVisible: boolean;
  index: number;
};

type DataEvent<T> = AppendEvent<T> | UpdateEvent<T>;

type Entry<T> = {
  value: T;
  id: number; // insertion based
  visible: boolean; // matches current filter?
  approxIndex: number; // we could possible live at this index in the output. No guarantees.
};

type Primitive = number | string | boolean | null | undefined;

type OutputChange =
  | {
      type: 'shift';
      index: number;
      location: 'before' | 'in' | 'after'; // relative to current window
      delta: number;
      newCount: number;
    }
  | {
      // an item, inside the current window, was changed
      type: 'update';
      index: number;
    }
  | {
      // something big and awesome happened. Drop earlier updates to the floor and start again
      // like: clear, filter or sorting change, etc
      type: 'reset';
      newCount: number;
    };

// TODO: remove class, export interface instead
export class DataSource<
  T,
  KEY extends keyof T = any,
  KEY_TYPE extends string | number | never = ExtractKeyType<T, KEY>
> {
  private nextId = 0;
  private _records: Entry<T>[] = [];

  private _recordsById: Map<KEY_TYPE, T> = new Map();
  private keyAttribute: undefined | keyof T;
  private idToIndex: Map<KEY_TYPE, number> = new Map();

  private sortBy: undefined | ((a: T) => Primitive);

  private reverse: boolean = false;

  private filter?: (value: T) => boolean;

  private dataUpdateQueue: DataEvent<T>[] = [];

  windowStart = 0;
  windowEnd = 0;

  private outputChangeListener?: (change: OutputChange) => void;

  // TODO:
  // private viewRecords: T[] = [];
  // private nextViewRecords: T[] = []; // for double buffering

  /**
   * Exposed for testing.
   * This is the base view data, that is filtered and sorted, but not reversed or windowed
   */
  // TODO: optimize: output can link to _records if no sort & filter
  output: Entry<T>[] = [];

  /**
   * Returns a direct reference to the stored records.
   * The collection should be treated as readonly and mutable;
   * the collection might be directly written to by the datasource,
   * so for an immutable state create a defensive copy:
   * `datasource.records.slice()`
   */
  get records(): readonly T[] {
    return this._records.map(unwrap);
  }

  /**
   * returns a direct reference to the stored records as lookup map,
   * based on the key attribute set.
   * The colletion should be treated as readonly and mutable (it might change over time).
   * Create a defensive copy if needed.
   */
  get recordsById(): ReadonlyMap<KEY_TYPE, T> {
    this.assertKeySet();
    return this._recordsById;
  }

  constructor(keyAttribute: KEY | undefined) {
    this.keyAttribute = keyAttribute;
    this.setSortBy(undefined);
  }

  /**
   * Returns a defensive copy of the current output.
   * Sort, filter, reverse and window are applied, but windowing isn't.
   * Start and end behave like slice, and default to the current window
   */
  public getOutput(
    start = this.windowStart,
    end = this.windowEnd,
  ): readonly T[] {
    if (this.reverse) {
      return this.output
        .slice(this.output.length - end, this.output.length - start)
        .reverse()
        .map((e) => e.value);
    } else {
      return this.output.slice(start, end).map((e) => e.value);
    }
  }

  private assertKeySet() {
    if (!this.keyAttribute) {
      throw new Error(
        'No key has been set. Records cannot be looked up by key',
      );
    }
  }

  private getKey(value: T): KEY_TYPE;
  private getKey(value: any): any {
    this.assertKeySet();
    const key = value[this.keyAttribute!];
    if ((typeof key === 'string' || typeof key === 'number') && key !== '') {
      return key;
    }
    throw new Error(`Invalid key value: '${key}'`);
  }

  /**
   * Returns the index of a specific key in the *source* set
   */
  indexOfKey(key: KEY_TYPE): number {
    this.assertKeySet();
    return this.idToIndex.get(key) ?? -1;
  }

  append(value: T) {
    if (this.keyAttribute) {
      const key = this.getKey(value);
      if (this._recordsById.has(key)) {
        throw new Error(`Duplicate key: '${key}'`);
      }
      this._recordsById.set(key, value);
      this.idToIndex.set(key, this._records.length);
    }
    const entry = {
      value,
      id: ++this.nextId,
      visible: this.filter ? this.filter(value) : true,
      approxIndex: -1,
    };
    this._records.push(entry);
    this.emitDataEvent({
      type: 'append',
      entry,
    });
  }

  /**
   * Updates or adds a record. Returns `true` if the record already existed.
   * Can only be used if a key is used.
   */
  upsert(value: T): boolean {
    this.assertKeySet();
    const key = this.getKey(value);
    if (this.idToIndex.has(key)) {
      const idx = this.idToIndex.get(key)!;
      this.update(idx, value);
      return true;
    } else {
      this.append(value);
      return false;
    }
  }

  /**
   * Replaces an item in the base data collection.
   * Note that the index is based on the insertion order, and not based on the current view
   */
  update(index: number, value: T) {
    const entry = this._records[index];
    const oldValue = entry.value;
    if (value === oldValue) {
      return;
    }
    const oldVisible = entry.visible;
    entry.value = value;
    entry.visible = this.filter ? this.filter(value) : true;
    if (this.keyAttribute) {
      const key = this.getKey(value);
      const currentKey = this.getKey(oldValue);
      if (currentKey !== key) {
        this._recordsById.delete(currentKey);
        this.idToIndex.delete(currentKey);
      }
      this._recordsById.set(key, value);
      this.idToIndex.set(key, index);
    }
    this.emitDataEvent({
      type: 'update',
      entry,
      oldValue,
      oldVisible,
      index,
    });
  }

  /**
   * Removes the first N entries.
   * @param amount
   */
  shift(_amount: number) {
    // increase an offset variable with amount, and correct idToIndex reads / writes with that
    // removes the affected records for _records, _recordsById and idToIndex
    throw new Error('Not Implemented');
  }

  setWindow(start: number, end: number) {
    this.windowStart = start;
    this.windowEnd = end;
  }

  setOutputChangeListener(
    listener: typeof DataSource['prototype']['outputChangeListener'],
  ) {
    if (this.outputChangeListener && listener) {
      console.warn('outputChangeListener already set');
    }
    this.outputChangeListener = listener;
  }

  setSortBy(sortBy: undefined | keyof T | ((a: T) => Primitive)) {
    if (this.sortBy === sortBy) {
      return;
    }
    if (typeof sortBy === 'string') {
      sortBy = property(sortBy); // TODO: it'd be great to recycle those if sortBy didn't change!
    }
    this.sortBy = sortBy as any;
    this.rebuildOutput();
  }

  setFilter(filter: undefined | ((value: T) => boolean)) {
    if (this.filter !== filter) {
      this.filter = filter;
      this.rebuildOutput();
    }
  }

  toggleReversed() {
    this.setReversed(!this.reverse);
  }

  setReversed(reverse: boolean) {
    if (this.reverse !== reverse) {
      this.reverse = reverse;
      // TODO: not needed anymore
      this.rebuildOutput();
    }
  }

  /**
   * The clear operation removes any records stored, but will keep the current view preferences such as sorting and filtering
   */
  clear() {
    this.windowStart = 0;
    this.windowEnd = 0;
    this._records = [];
    this._recordsById = new Map();
    this.idToIndex = new Map();
    this.dataUpdateQueue = [];
    this.output = [];
    this.notifyReset(0);
  }

  /**
   * The reset operation resets any view preferences such as sorting and filtering, but keeps the current set of records.
   */
  reset() {
    this.sortBy = undefined;
    // this.reverse = false;
    this.filter = undefined;
    this.rebuildOutput();
  }

  emitDataEvent(event: DataEvent<T>) {
    this.dataUpdateQueue.push(event);
    // TODO: schedule
    this.processEvents();
  }

  normalizeIndex(viewIndex: number): number {
    return this.reverse ? this.output.length - 1 - viewIndex : viewIndex;
  }

  getItem(viewIndex: number): T {
    return this.getEntry(viewIndex)?.value;
  }

  getEntry(viewIndex: number): Entry<T> {
    return this.output[this.normalizeIndex(viewIndex)];
  }

  notifyItemUpdated(viewIndex: number) {
    viewIndex = this.normalizeIndex(viewIndex);
    if (
      !this.outputChangeListener ||
      viewIndex < this.windowStart ||
      viewIndex >= this.windowEnd
    ) {
      return;
    }
    this.outputChangeListener({
      type: 'update',
      index: viewIndex,
    });
  }

  notifyItemShift(viewIndex: number, delta: number) {
    if (!this.outputChangeListener) {
      return;
    }
    viewIndex = this.normalizeIndex(viewIndex);
    if (this.reverse && delta < 0) {
      viewIndex -= delta; // we need to correct for normalize already using the new length after applying this change
    }
    // TODO: for 'before' shifts, should the window be adjusted automatically?
    this.outputChangeListener({
      type: 'shift',
      delta,
      index: viewIndex,
      newCount: this.output.length,
      location:
        viewIndex < this.windowStart
          ? 'before'
          : viewIndex >= this.windowEnd
          ? 'after'
          : 'in',
    });
  }

  notifyReset(count: number) {
    this.outputChangeListener?.({
      type: 'reset',
      newCount: count,
    });
  }

  processEvents() {
    const events = this.dataUpdateQueue.splice(0);
    events.forEach(this.processEvent);
  }

  processEvent = (event: DataEvent<T>) => {
    const {entry} = event;
    const {output, sortBy, filter} = this;
    switch (event.type) {
      case 'append': {
        // TODO: increase total counter
        if (!entry.visible) {
          // not in filter? skip this entry
          return;
        }
        if (!sortBy) {
          // no sorting? insert at the end, or beginning
          entry.approxIndex = output.length;
          output.push(entry);
          this.notifyItemShift(entry.approxIndex, 1);
        } else {
          this.insertSorted(entry);
        }
        break;
      }
      case 'update': {
        // short circuit; no view active so update straight away
        if (!filter && !sortBy) {
          output[event.index].approxIndex = event.index;
          this.notifyItemUpdated(event.index);
        } else if (!event.oldVisible) {
          if (!entry.visible) {
            // Done!
          } else {
            // insertion, not visible before
            this.insertSorted(entry);
          }
        } else {
          // Entry was visible previously
          const existingIndex = this.getSortedIndex(entry, event.oldValue);
          if (!entry.visible) {
            // Remove from output
            output.splice(existingIndex, 1);
            this.notifyItemShift(existingIndex, -1);
          } else {
            // Entry was and still is visible
            if (
              !this.sortBy ||
              this.sortBy(event.oldValue) === this.sortBy(entry.value)
            ) {
              // Still at same position, so done!
              this.notifyItemUpdated(existingIndex);
            } else {
              // item needs to be moved cause of sorting
              // TODO: possible optimization: if we discover that old and new index would be the same,
              // despite different sort values, we could still only emit an update
              output.splice(existingIndex, 1);
              this.notifyItemShift(existingIndex, -1);
              // find new sort index
              this.insertSorted(entry);
            }
          }
        }
        break;
      }
      default:
        throw new Error('unknown event type');
    }
  };

  rebuildOutput() {
    const {sortBy, filter, sortHelper} = this;
    // copy base array or run filter (with side effecty update of visible)
    // TODO: pending on the size, should we batch this in smaller steps? (and maybe merely reuse append)
    let output = filter
      ? this._records.filter((entry) => {
          entry.visible = filter(entry.value);
          return entry.visible;
        })
      : this._records.slice();
    // run array.sort
    // TODO: pending on the size, should we batch this in smaller steps?
    if (sortBy) {
      output = lodashSort(output, sortHelper);
    }

    // loop output and update all aproxindeces + visibilities
    output.forEach((entry, index) => {
      entry.approxIndex = index;
      entry.visible = true;
    });
    this.output = output;
    this.outputChangeListener?.({
      type: 'reset',
      newCount: output.length,
    });
  }

  private sortHelper = (a: Entry<T>) =>
    this.sortBy ? this.sortBy(a.value) : a.id;

  private getSortedIndex(entry: Entry<T>, oldValue: T) {
    const {output} = this;
    if (output[entry.approxIndex] === entry) {
      // yay!
      return entry.approxIndex;
    }
    let index = sortedIndexBy(
      output,
      {
        // TODO: find a way to avoid this object construction, create a better sortHelper?
        value: oldValue,
        id: -1,
        visible: true,
        approxIndex: -1,
      },
      this.sortHelper,
    );
    index--; // TODO: this looks like a plain bug!
    // the item we are looking for is not necessarily the first one at the insertion index
    while (output[index] !== entry) {
      index++;
      if (index >= output.length) {
        throw new Error('illegal state: sortedIndex not found'); // sanity check to avoid browser freeze if people mess up with internals
      }
    }

    return index;
  }

  private insertSorted(entry: Entry<T>) {
    // apply sorting
    const insertionIndex = sortedLastIndexBy(
      this.output,
      entry,
      this.sortHelper,
    );
    entry.approxIndex = insertionIndex;
    this.output.splice(insertionIndex, 0, entry);
    this.notifyItemShift(insertionIndex, 1);
  }
}

export function createDataSource<T, KEY extends keyof T = any>(
  initialSet: T[],
  keyAttribute: KEY,
): DataSource<T, KEY, ExtractKeyType<T, KEY>>;
export function createDataSource<T>(
  initialSet?: T[],
): DataSource<T, never, never>;
export function createDataSource<T, KEY extends keyof T>(
  initialSet: T[] = [],
  keyAttribute?: KEY | undefined,
): DataSource<T, any, any> {
  const ds = new DataSource<T, KEY>(keyAttribute);
  initialSet.forEach((value) => ds.append(value));
  return ds;
}

function unwrap<T>(entry: Entry<T>): T {
  return entry.value;
}
