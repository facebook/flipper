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
import {getChangelogPath} from '../utils/pathUtils';

const changelogKey = 'FlipperChangelogStatus';

type ChangelogStatus = {
  lastHeader: string;
};

let getChangelogFromDisk = (): string => {
  const changelogFromDisk: string = readFileSync(
    path.join(getChangelogPath(), 'CHANGELOG.md'),
    'utf8',
  ).trim();

  getChangelogFromDisk = () => changelogFromDisk;
  return changelogFromDisk;
};

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
  recent?: boolean;
};

export default class ChangelogSheet extends Component<Props, {}> {
  componentDidMount() {
    if (!this.props.recent) {
      // opened through the menu
      reportUsage('changelog:opened');
    }
  }

  componentWillUnmount(): void {
    if (this.props.recent) {
      markChangelogRead(window.localStorage, getChangelogFromDisk());
    }
    if (!this.props.recent) {
      reportUsage('changelog:closed');
    }
  }

  render() {
    return (
      <Container>
        <Title>Changelog</Title>
        <FlexRow>
          <Markdown
            source={
              this.props.recent
                ? getRecentChangelog(
                    window.localStorage,
                    getChangelogFromDisk(),
                  )
                : getChangelogFromDisk()
            }
            style={changelogSectionStyle}
          />
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

function getChangelogStatus(
  localStorage: Storage,
): ChangelogStatus | undefined {
  return JSON.parse(localStorage.getItem(changelogKey) || '{}');
}

function getFirstHeader(changelog: string): string {
  const match = changelog.match(/(^|\n)(#.*?)\n/);
  if (match) {
    return match[2];
  }
  return '';
}

export function hasNewChangesToShow(
  localStorage: Storage | undefined,
  changelog: string = getChangelogFromDisk(),
): boolean {
  if (!localStorage) {
    return false;
  }
  const status = getChangelogStatus(localStorage);
  if (!status || !status.lastHeader) {
    return true;
  }
  const firstHeader = getFirstHeader(changelog);
  if (firstHeader && firstHeader !== status.lastHeader) {
    return true;
  }
  return false;
}

export /*for test*/ function getRecentChangelog(
  localStorage: Storage | undefined,
  changelog: string,
): string {
  if (!localStorage) {
    return 'Changelog not available';
  }
  const status = getChangelogStatus(localStorage);
  if (!status || !status.lastHeader) {
    return changelog.trim();
  }
  const lastHeaderIndex = changelog.indexOf(status.lastHeader);
  if (lastHeaderIndex === -1) {
    return changelog.trim();
  } else {
    return changelog.substr(0, lastHeaderIndex).trim();
  }
}

export /*for test*/ function markChangelogRead(
  localStorage: Storage | undefined,
  changelog: string,
) {
  if (!localStorage) {
    return;
  }
  const firstHeader = getFirstHeader(changelog);
  if (!firstHeader) {
    return;
  }
  const status: ChangelogStatus = {
    lastHeader: firstHeader,
  };
  localStorage.setItem(changelogKey, JSON.stringify(status));
}
