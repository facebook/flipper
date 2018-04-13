/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
