/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import React from 'react';
import {CodeBlock} from 'flipper-plugin';

export const ErrorBlockContainer = styled(CodeBlock)({
  backgroundColor: '#f2dede',
  border: '1px solid #ebccd1',
  borderRadius: 4,
  color: '#a94442',
  overflow: 'auto',
  padding: 10,
  whiteSpace: 'pre',
});
ErrorBlockContainer.displayName = 'ErrorBlock:ErrorBlockContainer';

/**
 * Displaying error messages in a red box.
 */
export default class ErrorBlock extends React.Component<{
  /** Error message to display. Error object's `stack` or `message` property is used. */
  error: Error | string | null;
  /** Additional className added to the container. */
  className?: string;
}> {
  render() {
    const {className, error} = this.props;

    let stack = 'Unknown Error';
    if (typeof error === 'string') {
      stack = error;
    } else if (error && typeof error === 'object') {
      stack = error.stack || error.message || stack;
    }

    return (
      <ErrorBlockContainer className={className}>{stack}</ErrorBlockContainer>
    );
  }
}
