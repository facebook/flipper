/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Idler} from 'flipper-plugin';

export async function serialize(
  obj: Object,
  idler?: Idler,
  statusUpdate?: (msg: string) => void,
  statusMsg?: string,
): Promise<string> {
  return makeObjectSerializable(
    obj,
    idler,
    statusUpdate,
    statusMsg,
  ).then((obj) => JSON.stringify(obj));
}

export function deserialize(str: string): any {
  return deserializeObject(JSON.parse(str));
}

function processArray(
  _element: any,
  array: Array<any>,
  stack: Array<any>,
  dict: Map<any, any>,
): {childNeedsIteration: boolean; outputArr: Array<any>} {
  // Adds the array item to the stack if it needs to undergo iteration to serialise it. Otherwise it adds the serialized version of the item to the memoization dict
  const outputArr = [];
  let childNeedsIteration = false;
  for (const item of array) {
    const isItemInstanceOfObject = item instanceof Object;
    if (!dict.has(item) && isItemInstanceOfObject) {
      stack.push(item);
      childNeedsIteration = true;
      continue;
    } else if (!dict.has(item) && !isItemInstanceOfObject) {
      dict.set(item, item);
    }
    outputArr.push(dict.get(item));
  }
  return {childNeedsIteration, outputArr};
}

function processKeyValuePair(
  _element: any,
  key: any,
  value: any,
  stack: Array<any>,
  dict: Map<any, any>,
): {childNeedsIteration: boolean} {
  // Adds the key and value to the stack if it needs to undergo iteration to serialise it. Otherwise it adds the serialized version of key and value to the memoization dict
  let childNeedsIteration = false;
  const isKeyInstanceOfObject = key instanceof Object;
  if (!dict.has(key) && !isKeyInstanceOfObject) {
    dict.set(key, key);
  } else if (!dict.has(key) && isKeyInstanceOfObject) {
    stack.push(key);
    childNeedsIteration = true;
  }

  const isValueInstanceOfObject = value instanceof Object;
  if (!dict.has(value) && !isValueInstanceOfObject) {
    dict.set(value, value);
  } else if (!dict.has(value) && isValueInstanceOfObject) {
    stack.push(value);
    childNeedsIteration = true;
  }
  return {childNeedsIteration};
}

export function processMapElement(
  obj: Map<any, any>,
  dict: Map<any, any>,
  stack: Array<any>,
): {childNeedsIteration: boolean; outputArray: Array<any>} {
  const arr = [];
  let childNeedsIteration = false;
  for (const item of [...obj]) {
    const key = item[0];
    const value = item[1];
    childNeedsIteration =
      childNeedsIteration ||
      processKeyValuePair(obj, key, value, stack, dict).childNeedsIteration;
    if (!childNeedsIteration && dict.has(key) && dict.has(value)) {
      dict.set(item, [dict.get(key), dict.get(value)]);
      arr.push([dict.get(key), dict.get(value)]);
    }
  }
  return {childNeedsIteration, outputArray: arr};
}

export function processObjectToBeSerialized(
  element: Object,
  dict: Map<any, any>,
  stack: Array<any>,
): {childNeedsIteration: boolean; outputObject: Object} {
  const array = Object.entries(element);
  let obj = {};
  let childNeedsIteration = false;
  for (const item of array) {
    const key = item[0];
    const value = item[1];
    childNeedsIteration =
      childNeedsIteration ||
      processKeyValuePair(element, key, value, stack, dict).childNeedsIteration;
    if (!childNeedsIteration && dict.has(key) && dict.has(value)) {
      const serializedKey = dict.get(key);
      const serializedValue = dict.get(value);
      if (
        typeof serializedKey !== 'undefined' &&
        typeof serializedValue !== 'undefined'
      ) {
        obj = {...obj, [serializedKey]: serializedValue};
      }
    }
  }
  return {childNeedsIteration, outputObject: obj};
}
export async function makeObjectSerializable(
  obj: any,
  idler?: Idler,
  statusUpdate?: (msg: string) => void,
  statusMsg?: string,
): Promise<any> {
  if (!(obj instanceof Object)) {
    return obj;
  }
  const stack = [obj];
  const dict: Map<any, any> = new Map();
  let numIterations = 0;
  let prevStackLength = stack.length;
  let accumulator = prevStackLength;
  while (stack.length > 0) {
    if (idler && idler.shouldIdle()) {
      await idler.idle();
    }
    const element = stack[stack.length - 1];
    if (element instanceof Map) {
      const {childNeedsIteration, outputArray} = processMapElement(
        element,
        dict,
        stack,
      );
      if (childNeedsIteration) {
        continue;
      }
      dict.set(element, {
        __flipper_object_type__: 'Map',
        data: outputArray,
      });
    } else if (element instanceof Set) {
      const {childNeedsIteration, outputArr} = processArray(
        element,
        [...element],
        stack,
        dict,
      );
      if (childNeedsIteration) {
        continue;
      }
      dict.set(element, {
        __flipper_object_type__: 'Set',
        data: outputArr,
      });
    } else if (element instanceof Date) {
      dict.set(element, {
        __flipper_object_type__: 'Date',
        data: element.toString(),
      });
    } else if (element instanceof Array) {
      const {childNeedsIteration, outputArr} = processArray(
        element,
        element,
        stack,
        dict,
      );
      if (childNeedsIteration) {
        continue;
      }
      dict.set(element, outputArr);
    } else if (element instanceof Object) {
      const {childNeedsIteration, outputObject} = processObjectToBeSerialized(
        element,
        dict,
        stack,
      );
      if (childNeedsIteration) {
        continue;
      }
      dict.set(element, outputObject);
    }
    stack.pop();
    ++numIterations;
    accumulator +=
      stack.length >= prevStackLength ? stack.length - prevStackLength + 1 : 0;
    const percentage = (numIterations / accumulator) * 100;
    statusUpdate &&
      statusUpdate(
        `${
          statusMsg || 'Serializing Flipper '
        }: ${numIterations} / ${accumulator} (${percentage.toFixed(2)}%) `,
      );
    prevStackLength = stack.length;
  }
  return dict.get(obj);
}

export function deserializeObject(obj: any): any {
  if (!(obj instanceof Object)) {
    return obj;
  }
  if (obj instanceof Array) {
    return obj.map(deserializeObject);
  } else if (obj['__flipper_object_type__']) {
    const type = obj['__flipper_object_type__'];
    switch (type) {
      case 'Map': {
        return new Map(
          // @ts-ignore
          [...obj.data].map((item) => [...item].map(deserializeObject)),
        );
      }
      case 'Set': {
        return new Set([...obj.data].map(deserializeObject));
      }
      case 'Date':
        return new Date(obj.data);
    }
  }

  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({...acc, [key]: deserializeObject(value)}),
    {},
  );
}
