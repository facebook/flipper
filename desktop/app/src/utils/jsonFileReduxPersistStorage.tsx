/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {readFile, pathExists, mkdirp, writeFile} from 'fs-extra';
import path from 'path';

/**
 * Redux-persist storage engine for storing state in a human readable JSON file.
 *
 * Differs from the usual engines in two ways:
 *  * The key is ignored. This storage will only hold one key, so each setItem() call will overwrite the previous one.
 *  * Stored files are "human readable". Redux-persist calls storage engines with preserialized values that contain escaped strings inside json.
 *    This engine re-serializes them by parsing the inner strings to store them as top-level json.
 *    Transforms haven't been used because they operate before serialization, so all serialized values would still end up as strings.
 */
export default class JsonFileStorage {
  filepath: string;
  constructor(filepath: string) {
    this.filepath = filepath;
  }

  private parseFile(): Promise<any> {
    return readFile(this.filepath)
      .then((buffer) => buffer.toString())
      .then(this.deserializeValue)
      .catch((e) => {
        console.warn(
          `Failed to read settings file: "${this.filepath}". ${e}. Replacing file with default settings.`,
        );
        return this.writeContents(prettyStringify({})).then(() => ({}));
      });
  }

  getItem(_key: string, callback?: (_: any) => any): Promise<any> {
    const promise = this.parseFile();
    callback && promise.then(callback);
    return promise;
  }

  // Sets a new value and returns the value that was PREVIOUSLY set.
  // This mirrors the behaviour of the localForage storage engine.
  // Not thread-safe.
  setItem(_key: string, value: any, callback?: (_: any) => any): Promise<any> {
    const originalValue = this.parseFile();
    const writePromise = originalValue.then((_) =>
      this.writeContents(this.serializeValue(value)),
    );

    return Promise.all([originalValue, writePromise]).then(([o, _]) => {
      callback && callback(o);
      return o;
    });
  }

  removeItem(_key: string, callback?: () => any): Promise<void> {
    return this.writeContents(prettyStringify({}))
      .then((_) => callback && callback())
      .then(() => {});
  }

  serializeValue(value: string): string {
    const reconstructedObject = Object.entries(JSON.parse(value))
      .map(([k, v]: [string, unknown]) => [k, JSON.parse(v as string)])
      .reduce((acc: {[key: string]: any}, cv) => {
        acc[cv[0]] = cv[1];
        return acc;
      }, {});
    return prettyStringify(reconstructedObject);
  }

  deserializeValue(value: string): string {
    const reconstructedObject = Object.entries(JSON.parse(value))
      .map(([k, v]: [string, unknown]) => [k, JSON.stringify(v)])
      .reduce((acc: {[key: string]: string}, cv) => {
        acc[cv[0]] = cv[1];
        return acc;
      }, {});
    return JSON.stringify(reconstructedObject);
  }

  writeContents(content: string): Promise<void> {
    const dir = path.dirname(this.filepath);
    return pathExists(dir)
      .then((dirExists) => (dirExists ? Promise.resolve() : mkdirp(dir)))
      .then(() => writeFile(this.filepath, content));
  }
}

function prettyStringify(data: Object) {
  return JSON.stringify(data, null, 2);
}
