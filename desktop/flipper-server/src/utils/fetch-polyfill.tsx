/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import nodeFetch, {
  Headers as HeadersNF,
  Request as RequestNF,
  Response as ResponseNF,
} from 'node-fetch';

declare module globalThis {
  // eslint-disable-next-line no-var
  var fetch: typeof nodeFetch;
  // eslint-disable-next-line no-var
  var Headers: typeof HeadersNF;
  // eslint-disable-next-line no-var
  var Request: typeof RequestNF;
  // eslint-disable-next-line no-var
  var Response: typeof ResponseNF;
}

if (!globalThis.fetch) {
  globalThis.fetch = nodeFetch;
  globalThis.Headers = HeadersNF;
  globalThis.Request = RequestNF;
  globalThis.Response = ResponseNF;
}
