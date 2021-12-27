/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Partial clone of the POSIX part of https://github.com/nodejs/node/blob/master/lib/path.js
// Docs are copied from https://github.com/nodejs/node/blob/master/doc/api/path.md

const CHAR_DOT = 46;
const CHAR_FORWARD_SLASH = 47;

function isPosixPathSeparator(code: number) {
  return code === CHAR_FORWARD_SLASH;
}

// Resolves . and .. elements in a path with directory names
function normalizeString(
  path: string,
  allowAboveRoot: boolean,
  separator: string,
  isPathSeparator: (code: number) => boolean,
): string {
  let res = '';
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);
    else if (isPathSeparator(code)) break;
    else code = CHAR_FORWARD_SLASH;

    if (isPathSeparator(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== CHAR_DOT ||
          res.charCodeAt(res.length - 2) !== CHAR_DOT
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = '';
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

/**
 * The path.join() method joins all given path segments together using the platform-specific separator as a delimiter, then normalizes the resulting path.
 * Zero-length path segments are ignored. If the joined path string is a zero-length string then '.' will be returned, representing the current working directory.
 *
 * @example
 *
 * path.join('/foo', 'bar', 'baz/asdf', 'quux', '..');
 * Returns: '/foo/bar/baz/asdf'
 */
export function join(...args: string[]): string {
  if (args.length === 0) return '.';
  let joined;
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg.length > 0) {
      if (joined === undefined) joined = arg;
      else joined += `/${arg}`;
    }
  }
  if (joined === undefined) return '.';
  return normalize(joined);
}

/**
 * The path.normalize() method normalizes the given path, resolving '..' and '.' segments.
 * When multiple, sequential path segment separation characters are found (e.g. /), they are replaced by a single instance of /. Trailing separators are preserved.
 * If the path is a zero-length string, '.' is returned, representing the current working directory.
 *
 * @example
 * path.normalize('/foo/bar//baz/asdf/quux/..');
 * Returns: '/foo/bar/baz/asdf'
 */
export function normalize(path: string): string {
  if (path.length === 0) return '.';

  const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  const trailingSeparator =
    path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;

  // Normalize the path
  path = normalizeString(path, !isAbsolute, '/', isPosixPathSeparator);

  if (path.length === 0) {
    if (isAbsolute) return '/';
    return trailingSeparator ? './' : '.';
  }
  if (trailingSeparator) path += '/';

  return isAbsolute ? `/${path}` : path;
}

/**
 * The path.extname() method returns the extension of the path, from the last occurrence of the . (period) character to end of string in the last portion of the path. If there is no . in the last portion of the path, or if there are no . characters other than the first character of the basename of path (see path.basename()) , an empty string is returned.
 *
 * @example
 * path.extname('index.html');
 * Returns: '.html'
 *
 * path.extname('index.coffee.md');
 * Returns: '.md'
 *
 * path.extname('index.');
 * Returns: '.'
 *
 * path.extname('index');
 * Returns: ''
 *
 * path.extname('.index');
 * Returns: ''
 *
 * path.extname('.index.md');
 * Returns: '.md'
 */
export function extname(path: string): string {
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  let preDotState = 0;
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i);
    if (code === CHAR_FORWARD_SLASH) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (
    startDot === -1 ||
    end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  ) {
    return '';
  }
  return path.slice(startDot, end);
}

/**
 * The path.basename() method returns the last portion of a path, similar to the Unix basename command. Trailing directory separators are ignored.
 *
 * @example
 * path.basename('/foo/bar/baz/asdf/quux.html');
 * Returns: 'quux.html'
 *
 * path.basename('/foo/bar/baz/asdf/quux.html', '.html');
 * Returns: 'quux'
 */
export function basename(path: string, ext?: string) {
  let start = 0;
  let end = -1;
  let matchedSlash = true;

  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext === path) return '';
    let extIdx = ext.length - 1;
    let firstNonSlashEnd = -1;
    for (let i = path.length - 1; i >= 0; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1) {
          // We saw the first non-path separator, remember this index in case
          // we need it if the extension ends up not matching
          matchedSlash = false;
          firstNonSlashEnd = i + 1;
        }
        if (extIdx >= 0) {
          // Try to match the explicit extension
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1) {
              // We matched the extension, so mark this as the end of our path
              // component
              end = i;
            }
          } else {
            // Extension does not match, so our result is the entire path
            // component
            extIdx = -1;
            end = firstNonSlashEnd;
          }
        }
      }
    }

    if (start === end) end = firstNonSlashEnd;
    else if (end === -1) end = path.length;
    return path.slice(start, end);
  }
  for (let i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        start = i + 1;
        break;
      }
    } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}
