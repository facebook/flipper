/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export {FlipperServerImpl} from './FlipperServerImpl';
export {loadSettings} from './utils/settings';
export {loadLauncherSettings} from './utils/launcherSettings';
export {loadProcessConfig} from './utils/processConfig';
export {getEnvironmentInfo} from './utils/environmentInfo';

import GKImplementation from './fb-stubs/GK';
export {setupPrefetcher} from './fb-stubs/Prefetcher';

let loaded = false;

export function getGatekeepers(username: string): Record<string, boolean> {
  if (!loaded) {
    // this starts fetching gatekeepers, note that they will only be available on next restart!
    GKImplementation.init(username);
    loaded = true;
  }
  return GKImplementation.allGKs();
}

export {WEBSOCKET_MAX_MESSAGE_SIZE} from './comms/ServerWebSocket';
