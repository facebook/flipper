/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export interface Idler {
  shouldIdle(): boolean;
  idle(): Promise<void>;
  cancel(): void;
  isCancelled(): boolean;
}
