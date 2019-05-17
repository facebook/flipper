/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export function serialize(obj: Object): string {
  return JSON.stringify(makeObjectSerializable(obj));
}

export function deserialize(str: string): Object {
  return deserializeObject(JSON.parse(str));
}

function processArray(
  element: any,
  array: [any],
  stack: Array<any>,
  dict: Map<any, any>,
): {premature: boolean, outputArr: Array<any>} {
  let outputArr = [];
  let premature = false;
  for (const item of array) {
    if (!dict.has(item)) {
      if (!(item instanceof Object)) {
        dict.set(item, item);
      } else {
        stack.push(element);
        stack.push(item);
        premature = true;
        break;
      }
    }
    if (dict.has(item)) {
      dict.set(item, dict.get(item));
      outputArr.push(dict.get(item));
    }
  }
  return {premature, outputArr};
}

function processKeyValuePair(
  element: any,
  key: any,
  value: any,
  stack: Array<any>,
  dict: Map<any, any>,
): {premature: boolean} {
  let premature = false;
  if (!dict.has(key)) {
    if (!(key instanceof Object)) {
      dict.set(key, key);
    } else {
      stack.push(element);
      stack.push(key);
      premature = true;
      return {premature};
    }
  }
  if (!dict.has(value)) {
    if (!(value instanceof Object)) {
      dict.set(value, value);
    } else {
      stack.push(element);
      stack.push(value);
      premature = true;
    }
  }
  return {premature};
}

export function makeObjectSerializable(obj: any): any {
  if (!(obj instanceof Object)) {
    return obj;
  }
  let stack = [obj];
  const dict: Map<any, any> = new Map();
  while (stack.length > 0) {
    const element = stack.pop();
    if (element instanceof Map) {
      const arr = [];
      let premature = false;
      for (const item of [...element]) {
        const key = item[0];
        const value = item[1];
        premature = processKeyValuePair(element, key, value, stack, dict)
          .premature;
        if (premature) {
          break;
        }
        if (dict.has(key) && dict.has(value)) {
          dict.set(item, [dict.get(key), dict.get(value)]);
          arr.push([dict.get(key), dict.get(value)]);
        }
      }
      if (premature) {
        continue;
      }
      dict.set(element, {
        __flipper_object_type__: 'Map',
        data: arr,
      });
    } else if (element instanceof Set) {
      const {premature, outputArr} = processArray(
        element,
        [...element],
        stack,
        dict,
      );
      if (premature) {
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
      const {premature, outputArr} = processArray(
        element,
        element,
        stack,
        dict,
      );
      if (premature) {
        continue;
      }
      dict.set(element, outputArr);
    } else if (element instanceof Object) {
      const array = Object.entries(element);
      let obj = {};
      let premature = false;
      for (const item of array) {
        const key = item[0];
        const value = item[1];
        premature = processKeyValuePair(element, key, value, stack, dict)
          .premature;
        if (premature) {
          break;
        }
        const serializedKey = dict.get(key);
        const serializedValue = dict.get(value);
        if (
          typeof serializedKey !== 'undefined' &&
          typeof serializedValue !== 'undefined'
        ) {
          obj = {...obj, [serializedKey]: serializedValue};
        }
      }
      if (premature) {
        continue;
      }
      dict.set(element, obj);
    }
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
          [...obj.data].map(item => [...item].map(deserializeObject)),
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
