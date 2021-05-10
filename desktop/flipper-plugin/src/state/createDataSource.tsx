/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataSource, ExtractKeyType} from '../data-source/DataSource';
import {registerStorageAtom} from '../plugin/PluginBase';

type CreateDataSourceOptions<T, K extends keyof T> = {
  /**
   * If a key is set, the given field of the records is assumed to be unique,
   * and it's value can be used to perform lookups and upserts.
   */
  key?: K;
  /**
   * The maximum amount of records that this DataSource will store.
   * If the limit is exceeded, the oldest records will automatically be dropped to make place for the new ones
   */
  limit?: number;
  /**
   * Should this state persist when exporting a plugin?
   * If set, the dataSource will be saved / loaded under the key provided
   */
  persist?: string;
};

export function createDataSource<T, KEY extends keyof T = any>(
  initialSet: T[],
  options: CreateDataSourceOptions<T, KEY>,
): DataSource<T, KEY, ExtractKeyType<T, KEY>>;
export function createDataSource<T>(
  initialSet?: T[],
): DataSource<T, never, never>;
export function createDataSource<T, KEY extends keyof T>(
  initialSet: T[] = [],
  options?: CreateDataSourceOptions<T, KEY>,
): DataSource<T, any, any> {
  const ds = new DataSource<T, KEY>(options?.key);
  if (options?.limit !== undefined) {
    ds.limit = options.limit;
  }
  registerStorageAtom(options?.persist, ds);
  initialSet.forEach((value) => ds.append(value));
  return ds;
}
