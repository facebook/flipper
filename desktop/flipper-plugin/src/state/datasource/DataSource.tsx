/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// TODO: support better minification
// TODO: separate views from datasource to be able to support multiple transformation simultanously

type ExtractKeyType<
  T extends object,
  KEY extends keyof T
> = T[KEY] extends string ? string : T[KEY] extends number ? number : never;

type AppendEvent<T> = {
  type: 'append';
  value: T;
};
type UpdateEvent<T> = {
  type: 'update';
  value: T;
  index: number;
};

type DataEvent<T> = AppendEvent<T> | UpdateEvent<T>;

class DataSource<
  T extends object,
  KEY extends keyof T,
  KEY_TYPE extends string | number | never = ExtractKeyType<T, KEY>
> {
  private _records: T[] = [];
  private _recordsById: Map<KEY_TYPE, T> = new Map();
  private keyAttribute: undefined | keyof T;
  private idToIndex: Map<KEY_TYPE, number> = new Map();
  dataUpdateQueue: DataEvent<T>[] = [];
  // viewUpdateQueue;

  viewRecords: T[] = [];
  nextViewRecords: T[] = []; // for double buffering

  /**
   * Returns a direct reference to the stored records.
   * The collection should be treated as readonly and mutable;
   * the collection might be directly written to by the datasource,
   * so for an immutable state create a defensive copy:
   * `datasource.records.slice()`
   */
  get records(): readonly T[] {
    return this._records;
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
    this._records.push(value);
    this.emitDataEvent({
      type: 'append',
      value,
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

  update(index: number, value: T) {
    if (this.keyAttribute) {
      const key = this.getKey(value);
      const currentKey = this.getKey(this._records[index]);
      if (currentKey !== key) {
        this._recordsById.delete(currentKey);
        this.idToIndex.delete(currentKey);
      }
      this._recordsById.set(key, value);
      this.idToIndex.set(key, index);
    }
    this._records[index] = value;
    this.emitDataEvent({
      type: 'update',
      value,
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

  emitDataEvent(event: DataEvent<T>) {
    this.dataUpdateQueue.push(event);
    // TODO: schedule
    this.processEvents();
  }

  processEvents() {
    const events = this.dataUpdateQueue.splice(0);
    events.forEach((_event) => {
      // TODO:
    });
  }
}

export function createDataSource<T extends object, KEY extends keyof T = any>(
  initialSet: T[],
  keyAttribute: KEY,
): DataSource<T, KEY, ExtractKeyType<T, KEY>>;
export function createDataSource<T extends object>(
  initialSet?: T[],
): DataSource<T, never, never>;
export function createDataSource<T extends object, KEY extends keyof T>(
  initialSet: T[] = [],
  keyAttribute?: KEY | undefined,
): DataSource<T, any, any> {
  const ds = new DataSource<T, KEY>(keyAttribute);
  initialSet.forEach((value) => ds.append(value));
  return ds;
}
