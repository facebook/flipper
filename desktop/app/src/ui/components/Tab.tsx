/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Property} from 'csstype';

export type Props = {
  /**
   * Label of this tab to show in the tab list.
   */
  label: React.ReactNode;
  /**
   * Whether this tab is closable.
   */
  closable?: boolean;
  /**
   * Whether this tab is hidden. Useful for when you want a tab to be
   * inaccessible via the user but you want to manually set the `active` props
   * yourself.
   */
  hidden?: boolean;
  /**
   * Whether this tab should always be included in the DOM and have its
   * visibility toggled.
   */
  persist?: boolean;
  /**
   * Callback for when tab is closed.
   */
  onClose?: () => void;
  /**
   * Contents of this tab.
   */
  children?: React.ReactNode;
  width?: Property.Width<number>;
};

export default function Tab(_props: Props): JSX.Element {
  throw new Error("don't render me");
}
