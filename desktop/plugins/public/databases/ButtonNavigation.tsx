/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, ButtonGroup, Glyph, colors} from 'flipper';
import React from 'react';

export default React.memo(
  (props: {
    /** Back button is enabled */
    canGoBack: boolean;
    /** Forwards button is enabled */
    canGoForward: boolean;
    /** Callback when back button is clicked */
    onBack: () => void;
    /** Callback when forwards button is clicked */
    onForward: () => void;
  }) => {
    return (
      <ButtonGroup>
        <Button disabled={!props.canGoBack} onClick={props.onBack}>
          <Glyph
            name="chevron-left"
            size={16}
            color={
              props.canGoBack
                ? colors.macOSTitleBarIconActive
                : colors.macOSTitleBarIconBlur
            }
          />
        </Button>
        <Button disabled={!props.canGoForward} onClick={props.onForward}>
          <Glyph
            name="chevron-right"
            size={16}
            color={
              props.canGoForward
                ? colors.macOSTitleBarIconActive
                : colors.macOSTitleBarIconBlur
            }
          />
        </Button>
      </ButtonGroup>
    );
  },
);
