/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import pako from 'pako';
import {Request, Header, ResponseInfo} from './types';
import {Base64} from 'js-base64';

export function getHeaderValue(
  headers: Array<Header> | undefined,
  key: string,
): string {
  if (!headers) {
    return '';
  }
  for (const header of headers) {
    if (header.key.toLowerCase() === key.toLowerCase()) {
      return header.value;
    }
  }
  return '';
}

export function decodeBody(container: {
  headers?: Array<Header>;
  data: string | null | undefined;
}): string {
  if (!container.data) {
    return '';
  }

  try {
    const isGzip =
      getHeaderValue(container.headers, 'Content-Encoding') === 'gzip';
    if (isGzip) {
      try {
        const binStr = Base64.atob(container.data);
        const dataArr = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          dataArr[i] = binStr.charCodeAt(i);
        }
        // The request is gzipped, so convert the base64 back to the raw bytes first,
        // then inflate. pako will detect the BOM headers and return a proper utf-8 string right away
        return pako.inflate(dataArr, {to: 'string'});
      } catch (e) {
        // on iOS, the stream send to flipper is already inflated, so the content-encoding will not
        // match the actual data anymore, and we should skip inflating.
        // In that case, we intentionally fall-through
        if (!('' + e).includes('incorrect header check')) {
          throw e;
        }
      }
    }
    // If this is not a gzipped request, assume we are interested in a proper utf-8 string.
    //  - If the raw binary data in is needed, in base64 form, use container.data directly
    //  - either directly use container.data (for example)
    return Base64.decode(container.data);
  } catch (e) {
    console.warn(
      `Flipper failed to decode request/response body (size: ${container.data.length}): ${e}`,
    );
    return '';
  }
}

export function convertRequestToCurlCommand(
  request: Pick<Request, 'method' | 'url' | 'requestHeaders' | 'requestData'>,
): string {
  let command: string = `curl -v -X ${request.method}`;
  command += ` ${escapedString(request.url)}`;
  // Add headers
  request.requestHeaders.forEach((header: Header) => {
    const headerStr = `${header.key}: ${header.value}`;
    command += ` -H ${escapedString(headerStr)}`;
  });
  // Add body. TODO: we only want this for non-binary data! See D23403095
  const body = decodeBody({
    headers: request.requestHeaders,
    data: request.requestData,
  });
  if (body) {
    command += ` -d ${escapedString(body)}`;
  }
  return command;
}

function escapeCharacter(x: string) {
  const code = x.charCodeAt(0);
  return code < 16 ? '\\u0' + code.toString(16) : '\\u' + code.toString(16);
}

const needsEscapingRegex = /[\u0000-\u001f\u007f-\u009f!]/g;

// Escape util function, inspired by Google DevTools. Works only for POSIX
// based systems.
function escapedString(str: string) {
  if (needsEscapingRegex.test(str) || str.includes("'")) {
    return (
      "$'" +
      str
        .replace(/\\/g, '\\\\')
        .replace(/\'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(needsEscapingRegex, escapeCharacter) +
      "'"
    );
  }

  // Simply use singly quoted string.
  return "'" + str + "'";
}

export function getResponseLength(request: ResponseInfo): number {
  const lengthString = request.headers
    ? getHeaderValue(request.headers, 'content-length')
    : undefined;
  if (lengthString) {
    return parseInt(lengthString, 10);
  } else if (request.data) {
    return Buffer.byteLength(request.data, 'base64');
  }
  return 0;
}

export function formatDuration(duration: number | undefined) {
  if (typeof duration === 'number') return duration + 'ms';
  return '';
}

export function formatBytes(count: number | undefined): string {
  if (typeof count !== 'number') {
    return '';
  }
  if (count > 1024 * 1024) {
    return (count / (1024.0 * 1024)).toFixed(1) + ' MB';
  }
  if (count > 1024) {
    return (count / 1024.0).toFixed(1) + ' kB';
  }
  return count + ' B';
}

export function formatStatus(status: number | undefined) {
  return status ? '' + status : '';
}

export function requestsToText(requests: Request[]): string {
  const request = requests[0];
  if (!request || !request.url) {
    return '<empty request>';
  }

  let copyText = `# HTTP request for ${request.domain} (ID: ${request.id})
  ## Request
  HTTP ${request.method} ${request.url}
  ${request.requestHeaders
    .map(
      ({key, value}: {key: string; value: string}): string =>
        `${key}: ${String(value)}`,
    )
    .join('\n')}`;

  // TODO: we want decoding only for non-binary data! See D23403095
  const requestData = request.requestData
    ? decodeBody({
        headers: request.requestHeaders,
        data: request.requestData,
      })
    : null;
  const responseData = request.responseData
    ? decodeBody({
        headers: request.responseHeaders,
        data: request.responseData,
      })
    : null;

  if (requestData) {
    copyText += `\n\n${requestData}`;
  }
  if (request.status) {
    copyText += `

  ## Response
  HTTP ${request.status} ${request.reason}
  ${
    request.responseHeaders
      ?.map(
        ({key, value}: {key: string; value: string}): string =>
          `${key}: ${String(value)}`,
      )
      .join('\n') ?? ''
  }`;
  }

  if (responseData) {
    copyText += `\n\n${responseData}`;
  }
  return copyText;
}
