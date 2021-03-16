/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Notification = {
  id: string;
  title: string;
  message: string | React.ReactNode;
  severity: 'warning' | 'error';
  timestamp?: number;
  category?: string;
  /** The action will be available as deeplink payload when the notification is clicked. */
  action?: string;
};
