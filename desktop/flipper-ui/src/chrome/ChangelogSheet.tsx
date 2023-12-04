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
import {getRenderHostInstance} from '../RenderHost';

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
  recent?: boolean;
  changelog: string;
};

class ChangelogSheet extends Component<Props, {}> {
  componentDidMount() {
    if (!this.props.recent) {
      // opened through the menu
      reportUsage('changelog:opened');
    }
  }

  componentWillUnmount(): void {
    if (this.props.recent) {
      if (this.props.changelog) {
        markChangelogRead(window.localStorage, this.props.changelog);
      }
    }
    if (!this.props.recent) {
      reportUsage('changelog:closed');
    }
  }

  render() {
    return this.props.changelog ? (
      <Modal open title="Changelog" onCancel={this.props.onHide} footer={null}>
        <Markdown
          source={
            this.props.recent
              ? getRecentChangelog(window.localStorage, this.props.changelog)
              : this.props.changelog
          }
          style={changelogSectionStyle}
        />
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

export function showChangelog(onlyIfNewChanges: boolean) {
  getRenderHostInstance()
    .flipperServer.exec('get-changelog')
    .then((changelog) => {
      const show =
        !onlyIfNewChanges ||
        hasNewChangesToShow(window.localStorage, changelog);
      if (show) {
        Dialog.showModal((onHide) => (
          <ChangelogSheet
            onHide={onHide}
            recent={onlyIfNewChanges}
            changelog={changelog}
          />
        ));
      }
    })
    .catch((e) => {
      console.error('Failed to load changelog', e);
    });
}
