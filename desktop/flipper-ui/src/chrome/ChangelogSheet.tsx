/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Markdown} from '../ui';
import React, {Component} from 'react';
import {reportUsage} from 'flipper-common';
import {Modal} from 'antd';
import {Dialog, theme} from 'flipper-plugin';
import {getFlipperServer} from '../flipperServer';

const changelogKey = 'FlipperChangelogStatus';

type ChangelogStatus = {
  lastHeader: string;
};

const changelogSectionStyle = {
  padding: 10,
  maxHeight: '60vh',
  overflow: 'scroll',
  marginBottom: 10,
  background: theme.backgroundDefault,
  borderRadius: 4,
  width: '100%',
};

type Props = {
  onHide: () => void;
  changelog: string;
};

class ChangelogSheet extends Component<Props, {}> {
  componentDidMount() {
    // opened through the menu
    reportUsage('changelog:opened');
  }

  componentWillUnmount(): void {
    if (this.props.changelog) {
      markChangelogRead(window.localStorage, this.props.changelog);
    }
    reportUsage('changelog:closed');
  }

  render() {
    return this.props.changelog ? (
      <Modal open title="Changelog" onCancel={this.props.onHide} footer={null}>
        <Markdown source={this.props.changelog} style={changelogSectionStyle} />
      </Modal>
    ) : null;
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
  changelog: string,
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

export function showChangelog() {
  getFlipperServer()
    .exec('get-changelog')
    .then((changelog) => {
      Dialog.showModal((onHide) => (
        <ChangelogSheet onHide={onHide} changelog={changelog} />
      ));
    })
    .catch((e) => {
      console.error('Failed to load changelog', e);
    });
}
