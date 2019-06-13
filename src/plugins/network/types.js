/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type RequestId = string;

export type Request = {|
  id: RequestId,
  timestamp: number,
  method: string,
  url: string,
  headers: Array<Header>,
  data: ?string,
|};

export type Response = {|
  id: RequestId,
  timestamp: number,
  status: number,
  reason: string,
  headers: Array<Header>,
  data: ?string,
  isMock: boolean,
|};

export type Header = {|
  key: string,
  value: string,
|};

export type Route = {|
  requestUrl: string,
  method: string,
  data: string,
  isDuplicate: boolean,
|};