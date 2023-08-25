/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const FLUSH_TIMEOUT = 500;
const MAX_MESSAGES = 1000;

export type ScribeMessage = {
  category: string;
  message: string;
};

/**
 * Send messages to arbitrary Scribe categories. This is useful to log data to
 * LogView, Scuba, Hive, etc.
 */
export class ScribeLogger {
  constructor(
    sender: (messages: Array<ScribeMessage>) => Promise<void>,
    disabled = false,
    flushTimeout = FLUSH_TIMEOUT,
  ) {
    this.isFlushPending = false;
    this.queue = [];
    this.sendMessages = sender;
    this.flushTimeout = flushTimeout;
    this.disabled = disabled;
  }

  isFlushPending: boolean;
  queue: Array<ScribeMessage>;
  sendMessages: (messages: Array<ScribeMessage>) => Promise<void>;
  flushTimeout: number;
  disabled: boolean;

  /**
   * Send all the queued messages and reset.
   */
  flushQueue = async () => {
    const messages = this.queue.splice(0); // copy & clear
    try {
      // send all the message currently in the queue
      await this.sendMessages(messages);
    } catch (e) {
      console.debug(`[ScribeLogger] Failed to send messages: ${e}`);
      // restore messages if emit failed
      this.queue = messages.concat(this.queue);
      this.enforceQueueLimit();
    } finally {
      // reset the queue
      this.isFlushPending = false;
    }
  };

  /**
   * Add a message to be queued. Start a queue flush timer if one isn't already pending.
   */
  queueSend(message: ScribeMessage) {
    this.queue.push(message);
    this.enforceQueueLimit();

    // start a flush timer if none exists
    if (this.isFlushPending === false) {
      this.isFlushPending = true;
      if (this.flushTimeout >= 0) {
        setTimeout(this.flushQueue, FLUSH_TIMEOUT);
      } else {
        this.flushQueue();
      }
    }
  }

  enforceQueueLimit() {
    if (this.queue.length > MAX_MESSAGES) {
      console.debug('[ScribeLogger] Queue full, dropping oldest messages');
      this.queue = this.queue.slice(Math.floor(MAX_MESSAGES / 10));
    }
  }

  /**
   * Messages are not guaranteed to be sent right away.
   */
  send(message: ScribeMessage) {
    if (this.disabled) {
      return;
    }
    this.queueSend(message);
  }
}
