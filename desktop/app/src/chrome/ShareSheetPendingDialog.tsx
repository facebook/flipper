/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  styled,
  Button,
  colors,
  Spacer,
  FlexRow,
  Text,
  LoadingIndicator,
} from '../ui';
import React from 'react';

const Container = styled(FlexColumn)({
  padding: 20,
});

const Center = styled(FlexColumn)({
  alignItems: 'center',
  paddingTop: 50,
  paddingBottom: 50,
});

const Uploading = styled(Text)({
  marginTop: 15,
});

export default function (props: {
  statusMessage: string;
  statusUpdate: string | null;
  hideNavButtons?: boolean;
  onCancel?: () => void;
  onRunInBackground?: () => void;
  width?: number;
}) {
  return (
    <Container style={{width: props.width}}>
      <Center>
        <LoadingIndicator size={30} />
        {props.statusUpdate && props.statusUpdate.length > 0 ? (
          <Uploading bold color={colors.macOSTitleBarIcon}>
            {props.statusUpdate}
          </Uploading>
        ) : (
          <Uploading bold color={colors.macOSTitleBarIcon}>
            {props.statusMessage}
          </Uploading>
        )}
      </Center>
      {!props.hideNavButtons && props.onCancel && props.onRunInBackground && (
        <FlexRow>
          <Spacer />
          <Button
            compact
            padded
            onClick={() => {
              props.onCancel && props.onCancel();
            }}>
            Cancel
          </Button>
          <Button
            compact
            padded
            type="primary"
            onClick={() => {
              props.onRunInBackground && props.onRunInBackground();
            }}>
            Run In Background
          </Button>
        </FlexRow>
      )}
    </Container>
  );
}
