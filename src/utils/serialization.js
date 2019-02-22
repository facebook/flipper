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

export function makeObjectSerializable(obj: any): any {
  if (!(obj instanceof Object)) {
    return obj;
  }
  if (obj instanceof Map) {
    return {
      __flipper_object_type__: 'Map',
      data: [...obj].map(makeObjectSerializable),
    };
  } else if (obj instanceof Set) {
    return {
      __flipper_object_type__: 'Set',
      data: [...obj].map(makeObjectSerializable),
    };
  } else if (obj instanceof Date) {
    return {
      __flipper_object_type__: 'Date',
      data: obj.toString(),
    };
  } else if (obj instanceof Array) {
    return obj.map(makeObjectSerializable);
  }

  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({...acc, [key]: makeObjectSerializable(value)}),
    {},
  );
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
