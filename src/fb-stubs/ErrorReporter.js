/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

/*
 * This class exists to allow error reporting to your own service.
 * The recommended way to use this, is to instantiate it inside LogManager,
 * so that all logged errors get reported to this class.
 */
export function cleanStack(stack: string, loc: ?string) {}
import type ScribeLogger from './ScribeLogger';

export type ObjectError =
  | Error
  | {
      message: string,
      stack?: string,
    };

export default class ErrorReporter {
  constructor(scribeLogger: ScribeLogger) {}
  report(err: ObjectError) {}
}
