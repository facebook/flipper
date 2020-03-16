/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexRow, Button} from '../ui/index';
import {styled, LoadingIndicator, Text} from 'flipper';
import React, {Component} from 'react';
import {colors} from '../ui/components/colors';

const Wrapper = styled(FlexRow)({
  color: colors.light50,
  alignItems: 'center',
  marginLeft: 10,
});

type Props = {
  msg: string;
  onCancel: () => void;
};

export default class CancellableExportStatus extends Component<Props> {
  render() {
    const {msg, onCancel} = this.props;
    return (
      <Wrapper>
        <LoadingIndicator size={16} />
        &nbsp;
        <Text>{msg}</Text>
        &nbsp;
        <Button onClick={onCancel}> Cancel </Button>
      </Wrapper>
    );
  }
}
