/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import ButtonGroup from './ButtonGroup.js';
import Button from './Button.js';

export default function ButtonNavigationGroup(props: {|
  canGoBack: boolean,
  canGoForward: boolean,
  onBack: () => void,
  onForward: () => void,
|}) {
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
