/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ButtonGroup from './ButtonGroup';
import Button from './Button';
import React from 'react';

/**
 * Button group to navigate back and forth.
 */
export default function ButtonNavigationGroup(props: {
  /** Back button is enabled */
  canGoBack: boolean;
  /** Forwards button is enabled */
  canGoForward: boolean;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Callback when forwards button is clicked */
  onForward: () => void;
}) {
  return (
    <ButtonGroup>
      <Button disabled={!props.canGoBack} onClick={props.onBack}>
        {'<'}
      </Button>

      <Button disabled={!props.canGoForward} onClick={props.onForward}>
        {'<'}
      </Button>
    </ButtonGroup>
  );
}
