/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';

/**
 * A TextParagraph component.
 */
const TextParagraph = styled.view({
  marginBottom: 10,

  '&:last-child': {
    marginBottom: 0,
  },
});

export default TextParagraph;
