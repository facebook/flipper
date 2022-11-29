/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
import {Glyph} from 'flipper';

type NoDataProps = {
  message: string;
};
export const NoData: React.FC<NoDataProps> = ({message}) => {
  return (
    <div style={{textAlign: 'center'}}>
      <Glyph name="stop" size={24} style={{margin: 20}} />
      <p>{message}</p>
    </div>
  );
};
