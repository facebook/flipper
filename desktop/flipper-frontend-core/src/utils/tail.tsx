/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'eventemitter3';
import fs, {FSWatcher} from 'fs-extra';
import path from 'path';

export type TailOptions = {
  separator: RegExp;
  encoding: BufferEncoding;
  fromBeginning: boolean;
};

type TailBlock = {
  start: number;
  end: number;
};

export class Tail extends EventEmitter {
  absPath: string;
  dispatcher = new EventEmitter();
  buffer = '';
  queue: TailBlock[] = [];
  isWatching = false;
  currentCursorPosition = 0;
  watcher: FSWatcher | undefined = undefined;

  constructor(
    private readonly filename: string,
    private readonly options: TailOptions = {
      separator: /[\r]{0,1}\n/,
      fromBeginning: true,
      encoding: 'utf8',
    },
  ) {
    super();

    this.absPath = path.dirname(this.filename);
    this.dispatcher.on('next', () => {
      this.read_();
    });
  }

  async watch() {
    if (this.isWatching) {
      return;
    }
    this.isWatching = true;

    let startingCursor = 0;
    if (!this.options.fromBeginning) {
      startingCursor = await this.latestPosition_();
    }

    this.watch_(startingCursor, this.options.fromBeginning);
  }

  unwatch() {
    if (this.watcher) {
      this.watcher.close();
    }
    this.isWatching = false;
  }

  private async latestPosition_(): Promise<number> {
    return (await fs.stat(this.filename)).size;
  }

  private read_() {
    if (this.queue.length >= 1) {
      const block = this.queue[0];
      if (block.end > block.start) {
        const stream = fs.createReadStream(this.filename, {
          start: block.start,
          end: block.end - 1,
          encoding: this.options.encoding,
        });
        stream.on('error', (error) => {
          this.emit('error', error);
        });
        stream.on('end', () => {
          this.queue.shift();
          if (this.queue.length > 0) {
            this.dispatcher.emit('next');
          }
          if (this.buffer.length > 0) {
            this.emit('line', this.buffer);
            this.buffer = '';
          }
        });
        stream.on('data', (d) => {
          this.buffer += d;
          const parts = this.buffer.split(this.options.separator);
          // The last part may be an incomplete chunk, so
          // push that back into the buffer. Otherwise, reset buffer.
          this.buffer = parts.pop() || '';
          for (const chunk of parts) {
            this.emit('line', chunk);
          }
        });
      }
    }
  }

  private async fileUpdated_() {
    const latestPosition = await this.latestPosition_();
    // Case where text is not appended but it's actually a w+
    if (latestPosition < this.currentCursorPosition) {
      this.currentCursorPosition = latestPosition;
    } else if (latestPosition > this.currentCursorPosition) {
      this.queue.push({start: this.currentCursorPosition, end: latestPosition});
      this.currentCursorPosition = latestPosition;
      // Only emit if the queue was empty and now is not.
      if (this.queue.length == 1) {
        this.dispatcher.emit('next');
      }
    }
  }

  private watch_(cursor: number, readPrevious: boolean) {
    this.currentCursorPosition = cursor;
    if (readPrevious) {
      this.fileUpdated_();
    }

    this.watcher = fs.watch(this.filename, {}, (eventType, filename) => {
      this.watchEvent_(eventType, filename);
    });
  }

  private watchEvent_(eventType: string, _filename: string) {
    try {
      if (eventType === 'change') {
        this.fileUpdated_();
      }
    } catch (err) {}
  }
}
