/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/*
 * This class exists to allow error reporting to your own service.
 * The recommended way to use this, is to instantiate it inside Logger,
 * so that all logged errors get reported to this class.
 */
export function cleanStack(_stack: string, _loc?: string) {}
import ScribeLogger from './ScribeLogger';

export default class ErrorReporter {
  constructor(_scribeLogger: ScribeLogger) {}
  report(_err: Error) {}
}
