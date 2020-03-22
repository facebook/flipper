/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';

import Bordered from './Bordered';
import {colors} from './colors';

/**
 * Displays all children in a bordered, zebra styled vertical layout
 */
const AlternatingRows: React.FC<{
  children: React.ReactNode[] | React.ReactNode;
}> = ({children}) => (
  <Bordered style={{flexDirection: 'column'}}>
    {(Array.isArray(children) ? children : [children]).map((child, idx) => (
      <div
        key={idx}
        style={{
          padding: 8,
          background: idx % 2 === 0 ? colors.light02 : colors.white,
        }}>
        {child}
      </div>
    ))}
  </Bordered>
);

export default AlternatingRows;
