/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
