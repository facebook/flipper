/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';

type Props = {
  grow?: boolean;
  scrollable?: boolean;
  maxHeight?: number;
};

/**
 *
 * @deprecated use `Layout.Container` from flipper-plugin instead
 */
const View = styled.div<Props>((props) => ({
  height: props.grow ? '100%' : 'auto',
  overflow: props.scrollable ? 'auto' : 'visible',
  position: 'relative',
  width: props.grow ? '100%' : 'auto',
  maxHeight: props.maxHeight,
}));
View.displayName = 'View';

export default View;
