/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, styled, Text, FlexRow, Button, Markdown} from 'flipper';
import {readFileSync} from 'fs';
import React, {Component} from 'react';
import path from 'path';
import {reportUsage} from '../utils/metrics';
import {getStaticPath} from '../utils/pathUtils';

const changelog: string = readFileSync(
  path.join(getStaticPath(), 'CHANGELOG.md'),
  'utf8',
);

const Container = styled(FlexColumn)({
  padding: 20,
  width: 600,
});

const Title = styled(Text)({
  marginBottom: 18,
  marginRight: 10,
  fontWeight: 100,
  fontSize: '40px',
});

const changelogSectionStyle = {
  padding: 10,
  maxHeight: '60vh',
  overflow: 'scroll',
  marginBottom: 10,
  background: 'white',
  borderRadius: 4,
  width: '100%',
};

type Props = {
  onHide: () => void;
};

export default class ChangelogSheet extends Component<Props, {}> {
  componentDidMount() {
    reportUsage('changelog:opened');
  }

  componentWillUnmount(): void {
    reportUsage('changelog:closed');
  }

  render() {
    return (
      <Container>
        <Title>Changelog</Title>
        <FlexRow>
          <Markdown source={changelog} style={changelogSectionStyle} />
        </FlexRow>
        <FlexRow>
          <Button type="primary" compact padded onClick={this.props.onHide}>
            Close
          </Button>
        </FlexRow>
      </Container>
    );
  }
}
