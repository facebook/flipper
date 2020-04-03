/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState, useRef, useEffect} from 'react';
import styled from '@emotion/styled';
import {colors} from './colors';
import Text from './Text';
import FlexRow from './FlexRow';

export const StyledButton = styled.div<{toggled: boolean; large: boolean}>(
  ({large, toggled}) => ({
    width: large ? 60 : 30,
    height: large ? 32 : 16,
    background: toggled ? colors.green : colors.grey,
    display: 'block',
    borderRadius: '100px',
    position: 'relative',
    marginLeft: large ? 0 : 15, // margins in components should die :-/
    flexShrink: 0,
    '&::after': {
      content: '""',
      position: 'absolute',
      top: large ? 6 : 3,
      left: large ? (toggled ? 34 : 6) : toggled ? 18 : 3,
      width: large ? 20 : 10,
      height: large ? 20 : 10,
      background: 'white',
      borderRadius: '100px',
      transition: 'all cubic-bezier(0.3, 1.5, 0.7, 1) 0.3s',
    },
  }),
);
StyledButton.displayName = 'ToggleSwitch:StyledButton';

const Container = styled(FlexRow)({
  alignItems: 'center',
  cursor: 'pointer',
});
Container.displayName = 'ToggleSwitch:Container';

const Label = styled(Text)({
  marginLeft: 7,
  marginRight: 7,
  lineHeight: 1.3,
});
Label.displayName = 'ToggleSwitch:Label';

type Props = {
  /**
   * onClick handler.
   */
  onClick?: (event: React.MouseEvent) => void;
  /**
   * whether the button is toggled
   */
  toggled?: boolean;
  className?: string;
  label?: string;
  tooltip?: string;
  large?: boolean;
};

/**
 * Toggle Button.
 *
 * **Usage**
 *
 * ```jsx
 * import {ToggleButton} from 'flipper';
 * <ToggleButton onClick={handler} toggled={boolean}/>
 * ```
 */
export default function ToggleButton(props: Props) {
  const unmounted = useRef(false);
  const [switching, setSwitching] = useState(false);
  useEffect(
    () => () => {
      // suppress switching after unmount
      unmounted.current = true;
    },
    [],
  );
  return (
    <Container
      onClick={(e) => {
        setSwitching(true);
        setTimeout(() => {
          props?.onClick?.(e);
          if (unmounted.current === false) {
            setSwitching(false);
          }
        }, 300);
      }}
      title={props.tooltip}>
      <StyledButton
        large={!!props.large}
        className={props.className}
        toggled={switching ? !props.toggled : !!props.toggled}
      />
      {props.label && <Label>{props.label}</Label>}
    </Container>
  );
}
