/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger} from 'flipper-common';

type UIPerfEvents =
  | 'ui-perf-store-rehydrated'
  | 'ui-perf-root-rendered'
  | 'ui-perf-sandy-container-rendered'
  | 'ui-perf-everything-finally-loaded-jeeeez';

class UIPerfTracker {
  private t0!: number;

  _init() {
    this.t0 = performance.now();
  }

  track(event: UIPerfEvents, data?: any) {
    const tx = performance.now();
    getLogger().track('performance', event, {
      time: tx - this.t0,
      data,
    });
  }
}

export const uiPerfTracker = new UIPerfTracker();
