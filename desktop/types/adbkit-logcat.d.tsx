/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// This module declaration is a stub!
// Please extend this as needed.

declare module 'adbkit-logcat' {
  type PriorityValue = number;

  interface Reader extends NodeJS.EventEmitter {
    connect(stream: NodeJS.WriteStream): this;
    end(): this;
    exclude(tag: string): this;
    excludeAll(): this;
    include(tag: string, priority?: PriorityValue): this;
    includeAll(priority?: PriorityValue): this;
    resetFilters(): this;

    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'entry', listener: (entry: Entry) => void): this;
  }

  interface Entry {
    date: Date;
    pid: number;
    tid: number;
    priority: PriorityValue;
    tag: string;
    message: string;
    toBinary(): Buffer;
  }

  interface Priority {
    DEBUG: PriorityValue;
    DEFAULT: PriorityValue;
    ERROR: PriorityValue;
    FATAL: PriorityValue;
    INFO: PriorityValue;
    SILENT: PriorityValue;
    UNKNOWN: PriorityValue;
    VERBOSE: PriorityValue;
    WARN: PriorityValue;

    fromLetter(letter: string): PriorityValue | undefined;
    fromName(name: string): PriorityValue | undefined;
    toLetter(value: PriorityValue): string;
    toName(value: PriorityValue): string;
  }

  function readStream(
    stream: NodeJS.WriteStream,
    options?: {
      format: 'binary';
      fixLineFeeds: boolean;
    },
  ): Reader;

  const Priority: Priority;
  const Reader: Reader;
}
