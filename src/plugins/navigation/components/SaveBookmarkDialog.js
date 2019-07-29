/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {Button, FlexColumn, Input, Sheet, styled} from 'flipper';
import {useState} from 'react';

import type {Bookmark} from '../flow-types';

type Props = {|
  uri: ?string,
  shouldShow: boolean,
  onHide: ?() => void,
  onSubmit: Bookmark => void,
|};

const Container = styled(FlexColumn)({
  padding: 10,
  width: 400,
});

const Title = styled('div')({
  fontWeight: '500',
  marginTop: 8,
  marginLeft: 2,
  marginBottom: 8,
});

const URIContainer = styled('div')({
  marginLeft: 2,
  marginBottom: 8,
  overflowWrap: 'break-word',
});

const ButtonContainer = styled('div')({
  marginLeft: 'auto',
});

const NameInput = styled(Input)({
  margin: 0,
  marginBottom: 10,
  height: 30,
});

export default (props: Props) => {
  const {shouldShow, onHide, onSubmit, uri} = props;
  const [commonName, setCommonName] = useState('');
  if (uri == null || !shouldShow) {
    return null;
  } else {
    return (
      <Sheet onHideSheet={onHide}>
        {hide => {
          return (
            <Container>
              <Title>Save to bookmarks...</Title>
              <NameInput
                placeholder="Name..."
                value={commonName}
                onChange={event => setCommonName(event.target.value)}
              />
              <URIContainer>{uri}</URIContainer>
              <ButtonContainer>
                <Button
                  onClick={() => {
                    hide();
                    setCommonName('');
                  }}
                  compact
                  padded>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    hide();
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
