/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataSource} from 'flipper-plugin';
import {AnyNestedObject} from 'protobufjs';

export type RequestId = string;

export interface Request {
  id: RequestId;
  // request
  requestTime: Date;
  method: string;
  url: string;
  domain: string;
  requestHeaders: Array<Header>;
  requestData?: string;
  // response
  responseTime?: Date;
  status?: number;
  reason?: string;
  responseHeaders?: Array<Header>;
  responseData?: string;
  responseLength?: number;
  responseIsMock?: boolean;
  duration?: number;
  insights?: Insights;
}

export type Requests = DataSource<Request, 'id', string>;

export type RequestInfo = {
  id: RequestId;
  timestamp: number;
  method: string;
  url?: string;
  headers: Array<Header>;
  data: string | null | undefined;
};

export type ResponseInfo = {
  id: RequestId;
  timestamp: number;
  status: number;
  reason: string;
  headers: Array<Header>;
  data: string | null | undefined;
  isMock: boolean;
  insights: Insights | null | undefined;
  totalChunks?: number;
  index?: number;
};

export type ProtobufDefinition = {
  path: string;
  method: string;
  requestMessageFullName: string | null | undefined;
  requestDefinitions: {[k: string]: AnyNestedObject} | null | undefined;
  responseMessageFullName: string | null | undefined;
  responseDefinitions: {[k: string]: AnyNestedObject} | null | undefined;
};

export type AddProtobufEvent = {[baseUrl: string]: ProtobufDefinition[]};

export type ResponseFollowupChunk = {
  id: string;
  totalChunks: number;
  index: number;
  data: string;
};

export type Header = {
  key: string;
  value: string;
};

export type RetryInsights = {
  count: number;
  limit: number;
  timeSpent: number;
};

export type Insights = {
  dnsLookupTime: number | null | undefined;
  connectTime: number | null | undefined;
  sslHandshakeTime: number | null | undefined;
  preTransferTime: number | null | undefined;
  redirectsTime: number | null | undefined;
  timeToFirstByte: number | null | undefined;
  transferTime: number | null | undefined;
  postProcessingTime: number | null | undefined;
  // Amount of transferred data can be different from total size of payload.
  bytesTransfered: number | null | undefined;
  transferSpeed: number | null | undefined;
  retries: RetryInsights | null | undefined;
};

export type PartialResponse = {
  initialResponse?: ResponseInfo;
  followupChunks: {[id: number]: string};
};

export type PartialResponses = Record<string, PartialResponse>;
