/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Source: https://github.com/sindresorhus/linkify-urls/blob/e0cf2a2d51dc8f5f95d93f97ecb1cc804cc9e6be/index.js#L5
// n.b. no /g flag, as that makes the regex stateful! Which is not needed for splitting
export const urlRegex = /((?<!\+)(?:https?(?::\/\/))(?:www\.)?(?:[a-zA-Z\d-_.]+(?:(?:\.|@)[a-zA-Z\d]{2,})|localhost)(?:(?:[-a-zA-Z\d:%_+.~#*$!?&//=@]*)(?:[,](?![\s]))*)*)/;
