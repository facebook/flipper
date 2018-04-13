/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
