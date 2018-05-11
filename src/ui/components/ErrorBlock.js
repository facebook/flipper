/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import CodeBlock from './CodeBlock.js';

const ErrorBlockContainer = CodeBlock.extends({
  backgroundColor: '#f2dede',
  border: '1px solid #ebccd1',
  borderRadius: 4,
  color: '#a94442',
  overflow: 'auto',
  padding: 10,
});

export default class ErrorBlock extends styled.StylableComponent<{
  error: Error | string | void,
  className?: string,
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
