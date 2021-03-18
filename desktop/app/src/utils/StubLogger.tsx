/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, Args, TrackType} from '../fb-interfaces/Logger';
import {Store} from '../reducers/index';

export default class StubLogger implements Logger {
  constructor(_store: Store, _args?: Args) {}

  track(_type: TrackType, _event: string, _data?: any, _plugin?: string) {}

  trackTimeSince(_mark: string, _eventName?: string) {}

  info(_data: any, _category: string) {}

  warn(_data: any, _category: string) {}

  error(_data: any, _category: string) {}

  debug(_data: any, _category: string) {}
}
