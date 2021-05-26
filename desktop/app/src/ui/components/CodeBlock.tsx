/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';

/**
 * @deprecated, use CodeBlock from flipper-plugin instead
 */
const CodeBlock = styled.div({
  fontFamily: 'monospace',
});
CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
