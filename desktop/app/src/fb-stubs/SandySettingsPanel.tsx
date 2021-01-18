/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import ToggledSection from '../chrome/settings/ToggledSection';
import {ConfigText} from '../chrome/settings/configFields';

export default function (props: {
  toggled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ToggledSection {...props} label="Disable Sandy UI">
      {' '}
      <ConfigText
        content={'If disabled, Flipper will fall back to the classic design.'}
      />
    </ToggledSection>
  );
}
