/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
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
