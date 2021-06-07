/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
} from '../data-source/index';
import {registerStorageAtom} from '../plugin/PluginBase';

type CreateDataSourceOptions<T, K extends keyof T> = BaseDataSourceOptions<
  T,
  K
> & {
  /**
   * Should this state persist when exporting a plugin?
   * If set, the dataSource will be saved / loaded under the key provided
   */
  persist?: string;
};

export function createDataSource<T, KEY extends keyof T = any>(
  initialSet: readonly T[],
  options: CreateDataSourceOptions<T, KEY>,
): DataSource<T>;
export function createDataSource<T>(initialSet?: readonly T[]): DataSource<T>;
export function createDataSource<T, KEY extends keyof T>(
  initialSet: readonly T[] = [],
  options?: CreateDataSourceOptions<T, KEY>,
): DataSource<T> {
  const ds = baseCreateDataSource(initialSet, options);
  registerStorageAtom(options?.persist, ds);
  return ds;
}
