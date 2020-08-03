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

  const b64Decoded = atob(container.data);
  try {
    if (getHeaderValue(container.headers, 'Content-Encoding') === 'gzip') {
      // for gzip, use pako to decompress directly to unicode string
      return decompress(b64Decoded);
    }

    return b64Decoded;
  } catch (e) {
    console.warn('Discarding malformed body, size: ' + b64Decoded.length);
    return '';
  }
}

function decompress(body: string): string {
  const charArray = body.split('').map((x) => x.charCodeAt(0));

  const byteArray = new Uint8Array(charArray);

  try {
    if (body) {
      return pako.inflate(byteArray, {to: 'string'});
    } else {
      return body;
    }
  } catch (e) {
    // Sometimes Content-Encoding is 'gzip' but the body is already decompressed.
    // Assume this is the case when decompression fails.
  }

  return body;
}

export function convertRequestToCurlCommand(request: Request): string {
  let command: string = `curl -v -X ${request.method}`;
  command += ` ${escapedString(request.url)}`;
  // Add headers
  request.headers.forEach((header: Header) => {
    const headerStr = `${header.key}: ${header.value}`;
    command += ` -H ${escapedString(headerStr)}`;
  });
  // Add body
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
