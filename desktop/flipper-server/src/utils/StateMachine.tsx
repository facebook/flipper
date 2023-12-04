/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {EventEmitter} from 'events';

export class StateMachine<TState extends string, TError extends TState> {
  private _error?: Error;
  private valueEmitter = new EventEmitter();

  constructor(private _currentState: TState) {}

  get error() {
    return this._error;
  }

  get currentState() {
    return this._currentState;
  }

  set<T extends TState>(
    ...[newState, error]: T extends TError ? [T, Error] : [T]
  ) {
    this._currentState = newState as TState;
    this._error = error;
    this.valueEmitter.emit(newState as TState);
  }

  wait<T extends TState | TState[]>(state: T): Promise<void> {
    return new Promise((resolve) => {
      this.once(state, resolve);
    });
  }

  once(state: TState | TState[], cb: () => void): () => void {
    return this.subscribe(state, cb, {once: true});
  }

  on(state: TState | TState[], cb: () => void): () => void {
    return this.subscribe(state, cb);
  }

  is(targetState: TState | TState[]) {
    if (!Array.isArray(targetState)) {
      targetState = [targetState];
    }
    return targetState.includes(this._currentState);
  }

  private subscribe(
    state: TState | TState[],
    cb: () => void,
    {once}: {once?: boolean} = {},
  ): () => void {
    const statesNormalized = Array.isArray(state) ? state : [state];

    if (statesNormalized.includes(this._currentState)) {
      cb();
      return () => {};
    }

    let executed = false;
    const wrappedCb = () => {
      if (!executed) {
        executed = true;
        cb();
      }
    };

    const fn = once ? 'once' : 'on';
    statesNormalized.forEach((item) => {
      this.valueEmitter[fn](item, wrappedCb);
    });

    return () => {
      statesNormalized.forEach((item) => {
        this.valueEmitter.off(item, wrappedCb);
      });
    };
  }
}
