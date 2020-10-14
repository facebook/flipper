/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import pako from 'pako';
import {Request, Response, Header} from './types';
import {Base64} from 'js-base64';

export function getHeaderValue(headers: Array<Header>, key: string): string {
  for (const header of headers) {
    if (header.key.toLowerCase() === key.toLowerCase()) {
      return header.value;
    }
  }
  return '';
}

export function decodeBody(container: Request | Response): string {
  if (!container.data) {
    return '';
  }

  try {
    const isGzip =
      getHeaderValue(container.headers, 'Content-Encoding') === 'gzip';
    if (isGzip) {
      try {
        // The request is gzipped, so convert the base64 back to the raw bytes first,
        // then inflate. pako will detect the BOM headers and return a proper utf-8 string right away
        return pako.inflate(Base64.atob(container.data), {to: 'string'});
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

export function convertRequestToCurlCommand(request: Request): string {
  let command: string = `curl -v -X ${request.method}`;
  command += ` ${escapedString(request.url)}`;
  // Add headers
  request.headers.forEach((header: Header) => {
    const headerStr = `${header.key}: ${header.value}`;
    command += ` -H ${escapedString(headerStr)}`;
  });
  // Add body. TODO: we only want this for non-binary data! See D23403095
  const body = decodeBody(request);
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
