/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type RequestId = string;

export type Request = {
  id: RequestId;
  timestamp: number;
  method: string;
  url: string;
  headers: Array<Header>;
  data: string | null | undefined;
};

export type Response = {
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

export type Route = {
  requestUrl: string;
  requestMethod: string;
  responseData: string;
  responseHeaders: {[id: string]: Header};
  responseStatus?: string;
};

export type PersistedState = {
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
  partialResponses: {
    [id: string]: {
      initialResponse?: Response;
      followupChunks: {[id: number]: string};
    };
  };
};
