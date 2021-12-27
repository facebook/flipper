/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// TODO: Share with desktop/flipper-server-core/src/comms/__tests__/utils.ts
export class WSMessageAccumulator {
  private messages: unknown[] = [];
  private newMessageSubscribers: ((newMessageContent: unknown) => void)[] = [];

  constructor(private readonly timeout = 1000) {}

  get newMessage(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout exceeded'));
      }, this.timeout);

      this.newMessageSubscribers.push((newMessageContent: unknown) => {
        clearTimeout(timer);
        resolve(newMessageContent);
      });

      this.consume();
    });
  }

  add(newMessageContent: unknown) {
    this.messages.push(newMessageContent);
    this.consume();
  }

  private consume() {
    if (this.messages.length && this.newMessageSubscribers.length) {
      const message = this.messages.shift();
      const subscriber = this.newMessageSubscribers.shift();
      subscriber!(message);
    }
  }
}
