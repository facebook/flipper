/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DataSource,
  createDataSource as baseCreateDataSource,
  DataSourceOptions as BaseDataSourceOptions,
  DataSourceOptionKey as BaseDataSourceOptionKey,
} from '../data-source/DataSource';
import {registerStorageAtom} from '../plugin/PluginBase';

type DataSourceOptions<T> = BaseDataSourceOptions<T> & {
  /**
   * Should this state persist when exporting a plugin?
   * If set, the dataSource will be saved / loaded under the key provided
   */
  persist?: string;
};

export function createDataSource<T, Key extends keyof T>(
  initialSet: readonly T[],
  options: DataSourceOptions<T> & BaseDataSourceOptionKey<Key>,
): DataSource<T, T[Key] extends string | number ? T[Key] : never>;
export function createDataSource<T>(
  initialSet?: readonly T[],
  options?: DataSourceOptions<T>,
): DataSource<T, never>;
export function createDataSource<T, Key extends keyof T>(
  initialSet: readonly T[] = [],
  options?: DataSourceOptions<T> & BaseDataSourceOptionKey<Key>,
): DataSource<T, T[Key] extends string | number ? T[Key] : never> {
  const ds = options
    ? baseCreateDataSource(initialSet, options)
    : baseCreateDataSource(initialSet);
  registerStorageAtom(options?.persist, ds);
  return ds;
}
