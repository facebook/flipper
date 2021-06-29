/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * makeShallowSerializable will prepare common data structures, like Map and Set, for JSON serialization.
 * However, this will happen only for the root object and not recursively to keep things efficiently.
 *
 * The function does not take care of actual stringification; use JSON.serialize.
 */
export function makeShallowSerializable(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    assertSerializable(obj);
    return obj;
  }
  if (obj instanceof Map) {
    const data = Array.from(obj.entries());
    assertSerializable(data);
    return {
      __flipper_object_type__: 'Map',
      data,
    };
  } else if (obj instanceof Set) {
    const data = Array.from(obj.values());
    assertSerializable(data);
    return {
      __flipper_object_type__: 'Set',
      data,
    };
  } else if (obj instanceof Date) {
    return {
      __flipper_object_type__: 'Date',
      data: obj.getTime(),
    };
  } else {
    assertSerializable(obj);
    return obj;
  }
}

/**
 * Inverse of makeShallowSerializable
 */
export function deserializeShallowObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (obj['__flipper_object_type__']) {
    const type = obj['__flipper_object_type__'];
    switch (type) {
      case 'Map': {
        return new Map(obj.data);
      }
      case 'Set': {
        return new Set(obj.data);
      }
      case 'Date':
        return new Date(obj.data);
    }
  }
  return obj;
}

/**
 * Asserts a value is JSON serializable.
 * Will print a warning if a value is JSON serializable, but isn't a pure tree
 */
export function assertSerializable(obj: any) {
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.NODE_ENV !== 'development'
  ) {
    return;
  }
  // path to current object
  const path: string[] = [];
  // current object stack
  const stack = new Set<any>();
  // past objects, object -> path to reach it
  const seen = new Set<any>();

  // to safe a lot of memory allocations, if we find a duplicate, we just start over again to search for the first,
  // rather than storing all paths at first encounter
  let duplicateFound = false;
  let duplicatePath: string[] | undefined;
  let duplicateObject: any = undefined;
  let done = false;

  function check(value: any) {
    if (value === null || done) {
      return;
    }
    switch (typeof value) {
      case 'undefined':
        // undefined is not strictly speaking serializable, but behaves fine.
        // JSON.stringify({x : undefined})  ==>   '{}'
        break;
      case 'boolean':
      case 'number':
      case 'string':
        break;
      case 'object':
        // A cycle is truly not serializable, as it would create an unending serialization loop...
        if (stack.has(value)) {
          throw new Error(
            `Cycle detected: object at path '.${path.join(
              '.',
            )}' is referring to itself: '${value}'`,
          );
        }
        // Encountering an object multiple times is bad, as reference equality will be lost upon
        // deserialization, so the data isn't properly normalised.
        // But it *might* work fine, and can serialize, so we just warn

        // Warning is only printed during the second check loop, so that we know *both* paths
        // - Second walk (which finds first object)
        if (duplicateFound && duplicateObject && value === duplicateObject) {
          console.warn(
            `Duplicate value, object lives at path '.${duplicatePath!.join(
              '.',
            )}', but also at path '.${path!.join(
              '.',
            )}': '${value}'. This might not behave correct after import and lead to unnecessary big exports.`,
          );
          done = true; // no need to finish the second walk
          break;
        }
        // - First walk (which detects the duplicate and stores location of duplicate)
        if (!duplicateFound) {
          if (seen.has(value)) {
            duplicateFound = true;
            duplicateObject = value;
            duplicatePath = path.slice();
          }
          seen.add(value);
        }
        stack.add(value);
        const proto = Object.getPrototypeOf(value);
        if (Array.isArray(value)) {
          value.forEach((child, index) => {
            path.push('' + index);
            check(child);
            path.pop();
          });
        } else if (proto === null || proto === Object.prototype) {
          for (const key in value) {
            path.push(key);
            check(value[key]);
            path.pop();
          }
        } else {
          throw new Error(
            `Unserializable object type (${
              proto?.constructor?.name ?? 'Unknown'
            }) at path '.${path.join('')}': ${value}.`,
          );
        }
        stack.delete(value);
        break;
      case 'bigint':
      case 'function':
      case 'symbol':
      default:
        throw new Error(
          `Unserializable value (${typeof value}) at path '.${path.join(
            '.',
          )}': '${value}'`,
        );
    }
  }

  check(obj);
  // if there is a duplicate found, re-walk the tree so that we can print both of the paths and report it
  // this setup is slightly more confusion in code than walking once and storing past paths,
  // but a lot more efficient :)
  if (duplicateFound) {
    path.splice(0);
    seen.clear();
    stack.clear();
    check(obj);
  }
}
