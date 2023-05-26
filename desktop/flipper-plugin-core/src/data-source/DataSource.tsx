/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import sortedIndexBy from 'lodash/sortedIndexBy';
import sortedLastIndexBy from 'lodash/sortedLastIndexBy';
import property from 'lodash/property';
import lodashSort from 'lodash/sortBy';

// If the dataSource becomes to large, after how many records will we start to drop items?
const dropFactor = 0.1;
// what is the default maximum amount of records before we start shifting the data set?
const defaultLimit = 100 * 1000;
// if a shift on a sorted dataset exceeds this tresholds, we assume it is faster to re-sort the entire set,
// rather than search and remove the affected individual items
const shiftRebuildTreshold = 0.05;

const DEFAULT_VIEW_ID = '0';

type AppendEvent<T> = {
  type: 'append';
  entry: Entry<T>;
};
type UpdateEvent<T> = {
  type: 'update';
  entry: Entry<T>;
  oldValue: T;
  oldVisible: {
    [viewId: string]: boolean;
  };
  index: number;
};
type RemoveEvent<T> = {
  type: 'remove';
  entry: Entry<T>;
  index: number;
};
type ShiftEvent<T> = {
  type: 'shift';
  entries: Entry<T>[];
  amount: number;
};

type DataEvent<T> =
  | AppendEvent<T>
  | UpdateEvent<T>
  | RemoveEvent<T>
  | ShiftEvent<T>;

type Entry<T> = {
  value: T;
  id: number; // insertion based
  visible: {
    [viewId: string]: boolean;
  }; // matches current filter?
  approxIndex: {
    [viewId: string]: number;
  }; // we could possible live at this index in the output. No guarantees.
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
    }
  | {
      type: 'windowChange';
      newStart: number;
      newEnd: number;
    };

export type DataSourceOptionKey<K extends PropertyKey> = {
  /**
   * If a key is set, the given field of the records is assumed to be unique,
   * and it's value can be used to perform lookups and upserts.
   */
  key?: K;
};
export type DataSourceOptions = {
  /**
   * The maximum amount of records that this DataSource will store.
   * If the limit is exceeded, the oldest records will automatically be dropped to make place for the new ones
   */
  limit?: number;
};

export function createDataSource<T, Key extends keyof T>(
  initialSet: readonly T[],
  options: DataSourceOptions & DataSourceOptionKey<Key>,
): DataSource<T, T[Key] extends string | number ? T[Key] : never>;
export function createDataSource<T>(
  initialSet?: readonly T[],
  options?: DataSourceOptions,
): DataSource<T, never>;
export function createDataSource<T, Key extends keyof T>(
  initialSet: readonly T[] = [],
  options?: DataSourceOptions & DataSourceOptionKey<Key>,
): DataSource<T, Key> {
  const ds = new DataSource<T, Key>(options?.key);
  if (options?.limit !== undefined) {
    ds.limit = options.limit;
  }
  initialSet.forEach((value) => ds.append(value));
  return ds as any;
}

export class DataSource<T extends any, KeyType = never> {
  private nextId = 0;
  private _records: Entry<T>[] = [];
  private _recordsById: Map<KeyType, T> = new Map();
  /**
   * @readonly
   */
  public keyAttribute: keyof T | undefined;
  private idToIndex: Map<KeyType, number> = new Map();

  // if we shift the window, we increase shiftOffset to correct idToIndex results, rather than remapping all values
  private shiftOffset = 0;

  /**
   * The maximum amount of records this DataSource can have
   */
  public limit = defaultLimit;

  /**
   * The default view on this data source. A view applies
   * sorting, filtering and windowing to get more constrained output.
   *
   * Additional views can created through the fork method.
   */
  public readonly view: DataSourceView<T, KeyType>;

  public readonly additionalViews: {
    [viewId: string]: DataSourceView<T, KeyType>;
  };

  constructor(keyAttribute: keyof T | undefined) {
    this.keyAttribute = keyAttribute;
    this.view = new DataSourceView<T, KeyType>(this, DEFAULT_VIEW_ID);
    this.additionalViews = {};
  }

  public get size() {
    return this._records.length;
  }

  /**
   * Returns a defensive copy of the stored records.
   * This is a O(n) operation! Prefer using .size and .get instead if only a subset is needed.
   */
  public records(): readonly T[] {
    return this._records.map(unwrap);
  }

  public get(index: number) {
    return unwrap(this._records[index]);
  }

  public has(key: KeyType) {
    this.assertKeySet();
    return this._recordsById.has(key);
  }

  public getById(key: KeyType): T | undefined {
    this.assertKeySet();
    return this._recordsById.get(key);
  }

  public keys(): IterableIterator<KeyType> {
    this.assertKeySet();
    return this._recordsById.keys();
  }

  public entries(): IterableIterator<[KeyType, T]> {
    this.assertKeySet();
    return this._recordsById.entries();
  }

  public [Symbol.iterator](): IterableIterator<T> {
    const self = this;
    let offset = 0;
    return {
      next() {
        offset++;
        if (offset > self.size) {
          return {done: true, value: undefined};
        } else {
          return {
            value: self._records[offset - 1].value,
          };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  /**
   * Returns the index of a specific key in the *records* set.
   * Returns -1 if the record wansn't found
   */
  public getIndexOfKey(key: KeyType): number {
    this.assertKeySet();
    const stored = this.idToIndex.get(key);
    return stored === undefined ? -1 : stored + this.shiftOffset;
  }

  public append(value: T) {
    if (this._records.length >= this.limit) {
      // we're full! let's free up some space
      this.shift(Math.ceil(this.limit * dropFactor));
    }
    if (this.keyAttribute) {
      const key = this.getKey(value);
      if (this._recordsById.has(key)) {
        const existingValue = this._recordsById.get(key);
        console.warn(
          `Tried to append value with duplicate key: ${key} (key attribute is ${this.keyAttribute.toString()}). Old/new values:`,
          existingValue,
          value,
        );
        throw new Error(`Duplicate key`);
      }
      this._recordsById.set(key, value);
      this.storeIndexOfKey(key, this._records.length);
    }
    const visibleMap: {[viewId: string]: boolean} = {[DEFAULT_VIEW_ID]: false};
    const approxIndexMap: {[viewId: string]: number} = {[DEFAULT_VIEW_ID]: -1};
    Object.keys(this.additionalViews).forEach((viewId) => {
      visibleMap[viewId] = false;
      approxIndexMap[viewId] = -1;
    });
    const entry = {
      value,
      id: ++this.nextId,
      visible: visibleMap,
      approxIndex: approxIndexMap,
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
  public upsert(value: T): boolean {
    this.assertKeySet();
    const key = this.getKey(value);
    if (this.idToIndex.has(key)) {
      this.update(this.getIndexOfKey(key), value);
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
  public update(index: number, value: T) {
    const entry = this._records[index];
    const oldValue = entry.value;
    if (value === oldValue) {
      return;
    }
    const oldVisible = {...entry.visible};
    entry.value = value;
    if (this.keyAttribute) {
      const key = this.getKey(value);
      const currentKey = this.getKey(oldValue);
      if (currentKey !== key) {
        const existingIndex = this.getIndexOfKey(key);
        if (existingIndex !== -1 && existingIndex !== index) {
          throw new Error(
            `Trying to insert duplicate key '${key}', which already exist in the collection`,
          );
        }
        this._recordsById.delete(currentKey);
        this.idToIndex.delete(currentKey);
      }
      this._recordsById.set(key, value);
      this.storeIndexOfKey(key, index);
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
   * @param index
   *
   * Warning: this operation can be O(n) if a key is set
   */
  public delete(index: number) {
    if (index < 0 || index >= this._records.length) {
      throw new Error('Out of bounds: ' + index);
    }
    const entry = this._records.splice(index, 1)[0];
    if (this.keyAttribute) {
      const key = this.getKey(entry.value);
      this._recordsById.delete(key);
      this.idToIndex.delete(key);
      if (index === 0) {
        // lucky happy case, this is more efficient
        this.shiftOffset -= 1;
      } else {
        // Optimization: this is O(n)! Should be done as an async job
        this.idToIndex.forEach((keyIndex, key) => {
          if (keyIndex + this.shiftOffset > index)
            this.storeIndexOfKey(key, keyIndex - 1);
        });
      }
    }
    this.emitDataEvent({
      type: 'remove',
      index,
      entry,
    });
  }

  /**
   * Removes the item with the given key from this dataSource.
   * Returns false if no record with the given key was found
   *
   * Warning: this operation can be O(n) if a key is set
   */
  public deleteByKey(keyValue: KeyType): boolean {
    this.assertKeySet();
    const index = this.getIndexOfKey(keyValue);
    if (index === -1) {
      return false;
    }
    this.delete(index);
    return true;
  }

  /**
   * Removes the first N entries.
   * @param amount
   */
  public shift(amount: number) {
    amount = Math.min(amount, this._records.length);
    if (amount === this._records.length) {
      this.clear();
      return;
    }
    // increase an offset variable with amount, and correct idToIndex reads / writes with that
    this.shiftOffset -= amount;
    // removes the affected records for _records, _recordsById and idToIndex
    const removed = this._records.splice(0, amount);
    if (this.keyAttribute) {
      removed.forEach((entry) => {
        const key = this.getKey(entry.value);
        this._recordsById.delete(key);
        this.idToIndex.delete(key);
      });
    }

    if (
      this.view.isSorted &&
      removed.length > 10 &&
      removed.length > shiftRebuildTreshold * this._records.length
    ) {
      // removing a large amount of items is expensive when doing it sorted,
      // let's fallback to the async processing of all data instead
      // MWE: there is a risk here that rebuilding is too blocking, as this might happen
      // in background when new data arrives, and not explicitly on a user interaction
      this.rebuild();
    } else {
      this.emitDataEvent({
        type: 'shift',
        entries: removed,
        amount,
      });
    }
  }

  /**
   * The clear operation removes any records stored, but will keep the current view preferences such as sorting and filtering
   */
  public clear() {
    this._records = [];
    this._recordsById = new Map();
    this.shiftOffset = 0;
    this.idToIndex = new Map();
    this.rebuild();
  }

  /**
   * The rebuild function that would support rebuilding multiple views all at once
   */
  public rebuild() {
    this.view.rebuild();
    Object.entries(this.additionalViews).forEach(([, dataView]) => {
      dataView.rebuild();
    });
  }

  /**
   * Returns a fork of this dataSource, that shares the source data with this dataSource,
   * but has it's own FSRW pipeline, to allow multiple views on the same data
   */
  private fork(viewId: string): DataSourceView<T, KeyType> {
    this._records.forEach((entry) => {
      entry.visible[viewId] = entry.visible[DEFAULT_VIEW_ID];
      entry.approxIndex[viewId] = entry.approxIndex[DEFAULT_VIEW_ID];
    });
    const newView = new DataSourceView<T, KeyType>(this, viewId);
    // Refresh the new view so that it has all the existing records.
    newView.rebuild();
    return newView;
  }

  /**
   * Returns a new view of the `DataSource` if there doesn't exist a `DataSourceView` with the `viewId` passed in.
   * The view will allow different filters and sortings on the `DataSource` which can be helpful in cases
   * where multiple tables/views are needed.
   * @param viewId id for the `DataSourceView`
   * @returns `DataSourceView` that corresponds to the `viewId`
   */
  public getAdditionalView(viewId: string): DataSourceView<T, KeyType> {
    if (viewId in this.additionalViews) {
      return this.additionalViews[viewId];
    }
    this.additionalViews[viewId] = this.fork(viewId);
    return this.additionalViews[viewId];
  }

  public deleteView(viewId: string): void {
    if (viewId in this.additionalViews) {
      delete this.additionalViews[viewId];
      // TODO: Ideally remove the viewId in the visible and approxIndex of DataView outputs
      this._records.forEach((entry) => {
        delete entry.visible[viewId];
        delete entry.approxIndex[viewId];
      });
    }
  }

  private assertKeySet() {
    if (!this.keyAttribute) {
      throw new Error(
        'No key has been set. Records cannot be looked up by key',
      );
    }
  }

  private getKey(value: T): KeyType;
  private getKey(value: any): any {
    this.assertKeySet();
    const key = value[this.keyAttribute!];
    if ((typeof key === 'string' || typeof key === 'number') && key !== '') {
      return key;
    }
    throw new Error(`Invalid key value: '${key}'`);
  }

  private storeIndexOfKey(key: KeyType, index: number) {
    // de-normalize the index, so that on  later look ups its corrected again
    this.idToIndex.set(key, index - this.shiftOffset);
  }

  private emitDataEvent(event: DataEvent<T>) {
    // Optimization: potentially we could schedule this to happen async,
    // using a queue,
    // or only if there is an active view (although that could leak memory)
    this.view.processEvent(event);
    Object.entries(this.additionalViews).forEach(([, dataView]) => {
      dataView.processEvent(event);
    });
  }

  /**
   * @private
   */
  serialize(): readonly T[] {
    return this.records();
  }

  /**
   * @private
   */
  deserialize(value: any[]) {
    this.clear();
    value.forEach((record) => {
      this.append(record);
    });
  }
}

function unwrap<T>(entry: Entry<T>): T {
  return entry?.value;
}

export class DataSourceView<T, KeyType> {
  public readonly datasource: DataSource<T, KeyType>;
  private sortBy: undefined | ((a: T) => Primitive) = undefined;
  private reverse: boolean = false;
  private filter?: (value: T) => boolean = undefined;

  /**
   * @readonly
   */
  public windowStart = 0;
  /**
   * @readonly
   */
  public windowEnd = 0;
  private viewId;

  private outputChangeListeners = new Set<(change: OutputChange) => void>();

  /**
   * This is the base view data, that is filtered and sorted, but not reversed or windowed
   */
  private _output: Entry<T>[] = [];

  constructor(datasource: DataSource<T, KeyType>, viewId: string) {
    this.datasource = datasource;
    this.viewId = viewId;
  }

  public get size() {
    return this._output.length;
  }

  public get isSorted() {
    return !!this.sortBy;
  }

  public get isFiltered() {
    return !!this.filter;
  }

  public get isReversed() {
    return this.reverse;
  }

  /**
   * Returns a defensive copy of the current output.
   * Sort, filter, reverse and are applied.
   * Start and end behave like slice, and default to the currently active window.
   */
  public output(start = this.windowStart, end = this.windowEnd): readonly T[] {
    if (this.reverse) {
      return this._output
        .slice(this._output.length - end, this._output.length - start)
        .reverse()
        .map((e) => e.value);
    } else {
      return this._output.slice(start, end).map((e) => e.value);
    }
  }

  getViewIndex(entry: T): number {
    return this.output(0, Infinity).indexOf(entry);
  }

  public setWindow(start: number, end: number) {
    this.windowStart = start;
    this.windowEnd = end;
    this.notifyAllListeners({
      type: 'windowChange',
      newStart: start,
      newEnd: end,
    });
  }

  public addListener(listener: (change: OutputChange) => void) {
    this.outputChangeListeners.add(listener);
    return () => {
      this.outputChangeListeners.delete(listener);
    };
  }

  public setSortBy(sortBy: undefined | keyof T | ((a: T) => Primitive)) {
    if (this.sortBy === sortBy) {
      return;
    }
    if (
      typeof sortBy === 'string' &&
      (!this.sortBy || (this.sortBy as any).sortByKey !== sortBy)
    ) {
      sortBy = property(sortBy);
      Object.assign(sortBy, {
        sortByKey: sortBy,
      });
    }
    this.sortBy = sortBy as any;
    this.rebuild();
  }

  public setFilter(filter: undefined | ((value: T) => boolean)) {
    if (this.filter !== filter) {
      this.filter = filter;
      this.rebuild();
    }
  }

  public toggleReversed() {
    this.setReversed(!this.reverse);
  }

  public setReversed(reverse: boolean) {
    if (this.reverse !== reverse) {
      this.reverse = reverse;
      this.notifyReset(this._output.length);
    }
  }

  /**
   * The reset operation resets any view preferences such as sorting and filtering, but keeps the current set of records.
   */
  reset() {
    this.sortBy = undefined;
    this.reverse = false;
    this.filter = undefined;
    this.windowStart = 0;
    this.windowEnd = 0;
    this.rebuild();
  }

  private normalizeIndex(viewIndex: number): number {
    return this.reverse ? this._output.length - 1 - viewIndex : viewIndex;
  }

  public get(viewIndex: number): T {
    return this._output[this.normalizeIndex(viewIndex)]?.value;
  }

  public getEntry(viewIndex: number): Entry<T> {
    return this._output[this.normalizeIndex(viewIndex)];
  }

  public getViewIndexOfEntry(entry: Entry<T>) {
    // Note: this function leverages the fact that entry is an internal structure that is mutable,
    // so any changes in the entry being moved around etc will be reflected in the original `entry` object,
    // and we just want to verify that this entry is indeed still the same element, visible, and still present in
    // the output data set.
    if (
      entry.visible[this.viewId] &&
      entry.id === this._output[entry.approxIndex[this.viewId]]?.id
    ) {
      return this.normalizeIndex(entry.approxIndex[this.viewId]);
    }
    return -1;
  }

  public [Symbol.iterator](): IterableIterator<T> {
    const self = this;
    let offset = this.windowStart;
    return {
      next() {
        offset++;
        if (offset > self.windowEnd || offset > self.size) {
          return {done: true, value: undefined};
        } else {
          return {
            value: self.get(offset - 1),
          };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  private notifyAllListeners(change: OutputChange) {
    this.outputChangeListeners.forEach((listener) => listener(change));
  }

  private notifyItemUpdated(viewIndex: number) {
    viewIndex = this.normalizeIndex(viewIndex);
    if (
      !this.outputChangeListeners.size ||
      viewIndex < this.windowStart ||
      viewIndex >= this.windowEnd
    ) {
      return;
    }
    this.notifyAllListeners({
      type: 'update',
      index: viewIndex,
    });
  }

  private notifyItemShift(index: number, delta: number) {
    if (!this.outputChangeListeners.size) {
      return;
    }
    let viewIndex = this.normalizeIndex(index);
    if (this.reverse && delta < 0) {
      viewIndex -= delta; // we need to correct for normalize already using the new length after applying this change
    }
    // Idea: we could add an option to automatically shift the window for before events.
    this.notifyAllListeners({
      type: 'shift',
      delta,
      index: viewIndex,
      newCount: this._output.length,
      location:
        viewIndex < this.windowStart
          ? 'before'
          : viewIndex >= this.windowEnd
          ? 'after'
          : 'in',
    });
  }

  private notifyReset(count: number) {
    this.notifyAllListeners({
      type: 'reset',
      newCount: count,
    });
  }

  /**
   * @private
   */
  processEvent(event: DataEvent<T>) {
    const {_output: output, sortBy, filter} = this;
    switch (event.type) {
      case 'append': {
        const {entry} = event;
        entry.visible[this.viewId] = filter ? filter(entry.value) : true;
        if (!entry.visible[this.viewId]) {
          // not in filter? skip this entry
          return;
        }
        if (!sortBy) {
          // no sorting? insert at the end, or beginning
          entry.approxIndex[this.viewId] = output.length;
          output.push(entry);
          this.notifyItemShift(entry.approxIndex[this.viewId], 1);
        } else {
          this.insertSorted(entry);
        }
        break;
      }
      case 'update': {
        const {entry} = event;
        entry.visible[this.viewId] = filter ? filter(entry.value) : true;
        // short circuit; no view active so update straight away
        if (!filter && !sortBy) {
          output[event.index].approxIndex[this.viewId] = event.index;
          this.notifyItemUpdated(event.index);
        } else if (!event.oldVisible[this.viewId]) {
          if (!entry.visible[this.viewId]) {
            // Done!
          } else {
            // insertion, not visible before
            this.insertSorted(entry);
          }
        } else {
          // Entry was visible previously
          const existingIndex = this.getSortedIndex(entry, event.oldValue);
          if (!entry.visible[this.viewId]) {
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
              // possible optimization: if we discover that old and new index would be the same,
              // despite different sort values, we could still emit only an update instead of two shifts
              output.splice(existingIndex, 1);
              this.notifyItemShift(existingIndex, -1);
              // find new sort index
              this.insertSorted(entry);
            }
          }
        }
        break;
      }
      case 'remove': {
        this.processRemoveEvent(event.index, event.entry);
        break;
      }
      case 'shift': {
        // no sorting? then all items are removed from the start so optimize for that
        if (!sortBy) {
          let amount = 0;
          if (!filter) {
            amount = event.amount;
          } else {
            // if there is a filter, count the visibles and shift those
            for (let i = 0; i < event.entries.length; i++)
              if (event.entries[i].visible[this.viewId]) amount++;
          }
          output.splice(0, amount);
          this.notifyItemShift(0, -amount);
        } else {
          // we have sorting, so we need to remove item by item
          // we do this backward, so that approxIndex is more likely to be correct
          for (let i = event.entries.length - 1; i >= 0; i--) {
            this.processRemoveEvent(i, event.entries[i]);
          }
        }
        break;
      }
      default:
        throw new Error('unknown event type');
    }
  }

  private processRemoveEvent(index: number, entry: Entry<T>) {
    const {_output: output, sortBy, filter} = this;

    // filter active, and not visible? short circuilt
    if (!entry.visible[this.viewId]) {
      return;
    }
    // no sorting, no filter?
    if (!sortBy && !filter) {
      output.splice(index, 1);
      this.notifyItemShift(index, -1);
    } else {
      // sorting or filter is active, find the actual location
      const existingIndex = this.getSortedIndex(entry, entry.value);
      output.splice(existingIndex, 1);
      this.notifyItemShift(existingIndex, -1);
    }
  }

  /**
   * Rebuilds the entire view. Typically there should be no need to call this manually
   * @private
   */
  rebuild() {
    // Pending on the size, should we batch this in smaller non-blocking steps,
    // which we update in a double-buffering mechanism, report progress, and swap out when done?
    //
    // MWE: 9-3-2020 postponed for now, one massive sort seems fine. It might shortly block,
    // but that happens only (exception: limit caused shifts) on user interaction at very roughly 1ms per 1000 records.
    // See also comment below
    const {sortBy, filter, sortHelper} = this;
    // copy base array or run filter (with side effecty update of visible)
    // @ts-ignore prevent making _record public
    const records: Entry<T>[] = this.datasource._records;
    let output = filter
      ? records.filter((entry) => {
          entry.visible[this.viewId] = filter(entry.value);
          return entry.visible[this.viewId];
        })
      : records.slice();
    if (sortBy) {
      // Pending on the size, should we batch this in smaller steps?
      // The following sorthing method can be taskified, however,
      // the implementation is 20x slower than a native sort. So for now we stick to a
      // blocking sort, until we have some more numbers that this is hanging for anyone
      // const filtered = output;
      // output = [];
      // filtered.forEach((entry) => {
      //   const insertionIndex = sortedLastIndexBy(output, entry, sortHelper);
      //   output.splice(insertionIndex, 0, entry);
      // });
      output = lodashSort(output, sortHelper); // uses array.sort under the hood
    }

    // write approx indexes for faster lookup of entries in visible output
    for (let i = 0; i < output.length; i++) {
      output[i].approxIndex[this.viewId] = i;
    }
    this._output = output;
    this.notifyReset(output.length);
  }

  private sortHelper = (a: Entry<T>) =>
    this.sortBy ? this.sortBy(a.value) : a.id;

  private getSortedIndex(entry: Entry<T>, oldValue: T) {
    const {_output: output} = this;
    if (output[entry.approxIndex[this.viewId]] === entry) {
      // yay!
      return entry.approxIndex[this.viewId];
    }
    let index = sortedIndexBy(
      output,
      {
        value: oldValue,
        id: -1,
        visible: entry.visible,
        approxIndex: entry.approxIndex,
      },
      this.sortHelper,
    );
    index--;
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
      this._output,
      entry,
      this.sortHelper,
    );
    entry.approxIndex[this.viewId] = insertionIndex;
    this._output.splice(insertionIndex, 0, entry);
    this.notifyItemShift(insertionIndex, 1);
  }
}
