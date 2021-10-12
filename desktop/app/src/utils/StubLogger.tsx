/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, LoggerTrackType, LoggerArgs} from 'flipper-common';
import {Store} from '../reducers/index';

export default class StubLogger implements Logger {
  constructor(_store: Store, _args?: LoggerArgs) {}

  track(
    _type: LoggerTrackType,
    _event: string,
    _data?: any,
    _plugin?: string,
  ) {}

  trackTimeSince(_mark: string, _eventName?: string) {}

  info(_data: any, _category: string) {}

  warn(_data: any, _category: string) {}

  error(_data: any, _category: string) {}

  debug(_data: any, _category: string) {}
}
