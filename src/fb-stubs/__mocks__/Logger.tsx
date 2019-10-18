/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../../reducers/index';
import {getStringFromErrorLike} from '../../utils/errors';
import {Args, Logger, TrackType} from '../../fb-interfaces/Logger';

export function extractError(
  ...data: Array<any>
): {message: string; error: Error} {
  const message = data.map(getStringFromErrorLike).join(' ');
  const error = data.find(e => e instanceof Error) || new Error(message);
  return {
    message,
    error,
  };
}

export class FBLogger implements Logger {
  constructor(_store?: Store, _args?: Args) {}

  track(_type: TrackType, _event: string, _data?: any, _plugin?: string) {}

  trackTimeSince(_mark: string, _eventName?: string) {}

  info = (..._data: Array<any>) => {};

  warn = (..._data: Array<any>) => {};

  error = (..._data: Array<any>) => {};

  debug = (..._data: Array<any>) => {};

  getLogs(): Array<string> {
    return [];
  }
}

export function init(_store: Store, _args?: Args): Logger {
  return new FBLogger();
}

export function getInstance(): Logger {
  return new FBLogger();
}
