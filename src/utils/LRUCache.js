/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

class ListElement<K, V> {
  constructor(cache: LRUCache<K, V>, key: K, value: V) {
    this.cache = cache;
    this.before = undefined;
    this.next = undefined;
    this.set(key, value);
  }

  creationTime: number;
  cache: LRUCache<K, V>;
  before: ?ListElement<K, V>;
  next: ?ListElement<K, V>;
  key: K;
  value: V;

  set(key: K, value: V) {
    this.key = key;
    this.value = value;
    this.creationTime = Date.now();
  }

  hit() {
    this.detach();
    this.attach();
  }

  attach() {
    this.before = undefined;
    this.next = this.cache.head;
    this.cache.head = this;

    const {next} = this;
    if (next) {
      next.before = this;
    } else {
      this.cache.tail = this;
    }

    this.cache.size++;
  }

  detach() {
    const {before, next} = this;

    if (before) {
      before.next = next;
    } else {
      this.cache.head = next;
    }

    if (next) {
      next.before = before;
    } else {
      this.cache.tail = before;
    }

    this.cache.size--;
  }
}

type LRUCacheOptions = {|
  maxSize: number,
  maxAge?: number,
|};

export default class LRUCache<K, V> {
  constructor(options: LRUCacheOptions) {
    this.maxSize = options.maxSize;
    this.maxAge = options.maxAge;
    this.clear();
  }

  maxSize: number;
  maxAge: ?number;
  size: number;
  data: Map<K, ListElement<K, V>>;
  tail: ?ListElement<K, V>;
  head: ?ListElement<K, V>;

  clear() {
    this.size = 0;
    this.data = new Map();
    this.tail = undefined;
    this.head = undefined;
  }

  has(key: K): boolean {
    return this.data.has(key);
  }

  get(key: K, hit?: boolean = true): ?V {
    const cacheVal = this.data.get(key);
    if (!cacheVal) {
      return;
    }

    const {maxAge} = this;
    if (maxAge != null) {
      const timeNow = Date.now();
      const timeSinceCreation = timeNow - cacheVal.creationTime;
      if (timeSinceCreation > maxAge) {
        this.delete(key);
        return;
      }
    }

    if (hit) {
      cacheVal.hit();
    }

    return cacheVal.value;
  }

  pop(): ?ListElement<K, V> {
    const {tail} = this;
    if (!tail) {
      return;
    }

    this.delete(tail.key);

    tail.next = undefined;
    tail.before = undefined;

    return tail;
  }

  set(key: K, val: V, hit?: boolean = true) {
    const actual = this.data.get(key);

    if (actual) {
      actual.value = val;
      if (hit) {
        actual.hit();
      }
    } else {
      let cacheVal: ?ListElement<K, V>;

      if (this.size >= this.maxSize) {
        cacheVal = this.pop();

        if (cacheVal) {
          cacheVal.set(key, val);
        }
      }

      if (!cacheVal) {
        cacheVal = new ListElement(this, key, val);
      }

      this.data.set(key, cacheVal);
      cacheVal.attach();
    }
  }

  delete(key: K) {
    const val = this.data.get(key);
    if (!val) {
      return;
    }

    val.detach();
    this.data.delete(key);
  }
}
