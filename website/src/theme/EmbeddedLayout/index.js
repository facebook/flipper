/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import clsx from 'clsx';
import LayoutProviders from '@theme/LayoutProviders';
import useKeyboardNavigation from '@theme/hooks/useKeyboardNavigation';
import {ThemeClassNames} from '@docusaurus/theme-common';
import './styles.css';

function EmbeddedLayout(props) {
  const {children, wrapperClassName, pageClassName} = props;
  useKeyboardNavigation();
  return (
    <LayoutProviders>
      <div
        className={clsx(
          ThemeClassNames.wrapper.main,
          wrapperClassName,
          pageClassName,
          'embedded'
        )}>
        {children}
      </div>      
    </LayoutProviders>
  );
}

export default EmbeddedLayout;
