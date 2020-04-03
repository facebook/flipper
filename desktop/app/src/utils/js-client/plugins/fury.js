/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {FlipperPlugin, FlipperResponder, FlipperConnection} from '../api';

import type {FlipperPluginID} from '../api';

type EventId = string;

type EventType = number;
type ThreadID = number;
type SeqID = number;

type StackTraceElement = {
  className: string,
  methodName: string,
  fileName: string,
  lineNumber: number,
};

type FuryTaskEvent = {
  id: EventId,
  time: number,
  eventType: EventType,
  callStack: StackTraceElement[],
  extras: any,
  tag: string,
  parentTid: ThreadID,
  currentTid: ThreadID,
  parentSeqId: SeqID,
  currentSeqId: SeqID,
  isDirect: boolean,
  isPoint: boolean,
  isOnActivated: boolean,
};

export type ReqContext = {
  tag: string,
  parentSeqId: SeqID,
  currentSeqId: SeqID,
  isDirect: boolean,
  isPoint: boolean,
};

const structuredTraceFun = (error, structuredStackTrace) => {
  return structuredStackTrace;
};

function getStackTrace(): CallSite[] {
  const oldPrep = Error.prepareStackTrace;
  Error.prepareStackTrace = structuredTraceFun;
  const error = {};
  Error.captureStackTrace(error, getStackTrace);
  const stack = error.stack;
  Error.prepareStackTrace = oldPrep;
  return stack;
}

export class FuryPlugin extends FlipperPlugin {
  id: FlipperPluginID = 'Fury';

  onConnect(connection: FlipperConnection) {
    super.onConnect(connection);
    connection.receive(
      'toggleRecording',
      (data: any, responder: FlipperResponder) => {
        window.console.log(data);
      },
    );
  }

  processEvent(reqContext: ReqContext, isOnActivated: boolean) {
    const stack = getStackTrace();
    const eventType = reqContext.isPoint ? 2 : isOnActivated ? 0 : 1;
    const event: FuryTaskEvent = {
      id: reqContext.currentSeqId + '/' + eventType,
      time: new Date().getTime(),
      eventType: eventType,
      callStack: stack.map((frame) => {
        return {
          className: frame.getTypeName() || '',
          methodName: frame.getFunctionName() || '',
          fileName: frame.getFileName() || '',
          lineNumber: frame.getLineNumber() || 0,
        };
      }),
      extras: {},
      tag: reqContext.tag,
      parentTid: -1,
      currentTid: -1,
      parentSeqId: reqContext.parentSeqId,
      currentSeqId: reqContext.currentSeqId,
      isDirect: reqContext.isDirect,
      isPoint: reqContext.isPoint,
      isOnActivated: isOnActivated,
    };
    this._connection && this._connection.send('reportEvent', event);
  }
}
