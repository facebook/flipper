/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, FlexColumn, Input, Sheet, styled} from 'flipper';
import React, {useState} from 'react';
import {Bookmark, URI} from '../types';

type Props = {
  uri: string | null;
  edit: boolean;
  shouldShow: boolean;
  onHide?: () => void;
  onRemove: (uri: URI) => void;
  onSubmit: (bookmark: Bookmark) => void;
};

const Container = styled(FlexColumn)({
  padding: 10,
  width: 400,
});

const Title = styled.div({
  fontWeight: 500,
  marginTop: 8,
  marginLeft: 2,
  marginBottom: 8,
});

const URIContainer = styled.div({
  marginLeft: 2,
  marginBottom: 8,
  overflowWrap: 'break-word',
});

const ButtonContainer = styled.div({
  marginLeft: 'auto',
});

const NameInput = styled(Input)({
  margin: 0,
  marginBottom: 10,
  height: 30,
});

export default (props: Props) => {
  const {edit, shouldShow, onHide, onRemove, onSubmit, uri} = props;
  const [commonName, setCommonName] = useState('');
  if (uri == null || !shouldShow) {
    return null;
  } else {
    return (
      <Sheet onHideSheet={onHide}>
        {(onHide: () => void) => {
          return (
            <Container>
              <Title>
                {edit ? 'Edit bookmark...' : 'Save to bookmarks...'}
              </Title>
              <NameInput
                placeholder="Name..."
                value={commonName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCommonName(event.target.value)
                }
              />
              <URIContainer>{uri}</URIContainer>
              <ButtonContainer>
                <Button
                  onClick={() => {
                    onHide();
                    setCommonName('');
                  }}
                  compact
                  padded>
                  Cancel
                </Button>
                {edit ? (
                  <Button
                    type="danger"
                    onClick={() => {
                      onHide();
                      onRemove(uri);
                      setCommonName('');
                    }}
                    compact
                    padded>
                    Remove
                  </Button>
                ) : null}

                <Button
                  type="primary"
                  onClick={() => {
                    onHide();
                    onSubmit({uri, commonName});
                    // The component state is remembered even after unmounting.
                    // Thus it is necessary to reset the commonName here.
                    setCommonName('');
                  }}
                  compact
                  padded>
                  Save
                </Button>
              </ButtonContainer>
            </Container>
          );
        }}
      </Sheet>
    );
  }
};
