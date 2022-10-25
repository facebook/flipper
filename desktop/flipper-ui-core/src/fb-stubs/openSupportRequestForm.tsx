/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State} from '../reducers';

export type SupportRequestDetails = {
  title?: string;
  whatAlreadyTried?: string;
  everythingEverywhereAllAtOnceExportDownloadURL?: string;
};

export default function openSupportRequestForm(
  _state: State,
  _details?: SupportRequestDetails,
): Promise<void> {
  throw new Error('Not implemented!');
}
