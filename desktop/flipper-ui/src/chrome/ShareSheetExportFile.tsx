/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled, Text, FlexRow, Spacer} from '../ui';
import React, {Component} from 'react';
import {reportPlatformFailures} from 'flipper-common';
import {Logger} from 'flipper-common';
import {IdlerImpl} from '../utils/Idler';
import {
  EXPORT_FLIPPER_TRACE_EVENT,
  displayFetchMetadataErrors,
  exportStore,
} from '../utils/exportData';
import ShareSheetErrorList from './ShareSheetErrorList';
import ShareSheetPendingDialog from './ShareSheetPendingDialog';
import {ReactReduxContext, ReactReduxContextValue} from 'react-redux';
import {MiddlewareAPI} from '../reducers/index';
import {Modal} from 'antd';
import {exportFile} from '../utils/exportFile';

const Container = styled(FlexColumn)({
  padding: 20,
  width: 500,
});

const ErrorMessage = styled(Text)({
  display: 'block',
  marginTop: 6,
  wordBreak: 'break-all',
  whiteSpace: 'pre-line',
  lineHeight: 1.35,
});

const Title = styled(Text)({
  marginBottom: 6,
});

const InfoText = styled(Text)({
  lineHeight: 1.35,
  marginBottom: 15,
});

type Props = {
  onHide: () => void;
  logger: Logger;
};

type State = {
  fetchMetaDataErrors: {
    [plugin: string]: Error;
  } | null;
  result:
    | {
        kind: 'success';
      }
    | {
        kind: 'error';
        error: Error;
      }
    | {
        kind: 'pending';
      };
  statusUpdate: string | null;
};

export default class ShareSheetExportFile extends Component<Props, State> {
  static contextType: React.Context<ReactReduxContextValue> = ReactReduxContext;

  state: State = {
    fetchMetaDataErrors: null,
    result: {kind: 'pending'},
    statusUpdate: null,
  };

  get store(): MiddlewareAPI {
    return this.context.store;
  }

  idler = new IdlerImpl();

  async componentDidMount() {
    const mark = 'shareSheetExportFile';
    performance.mark(mark);
    try {
      const {serializedString, fetchMetaDataErrors} =
        await reportPlatformFailures(
          exportStore(this.store, false, this.idler, (msg: string) => {
            this.setState({statusUpdate: msg});
          }),
          `${EXPORT_FLIPPER_TRACE_EVENT}:UI_FILE`,
        );
      this.setState({
        fetchMetaDataErrors,
        result: fetchMetaDataErrors
          ? {error: JSON.stringify(fetchMetaDataErrors) as any, kind: 'error'}
          : {kind: 'success'},
      });

      await exportFile(serializedString, {
        defaultPath: 'export.flipper',
      });

      this.props.logger.trackTimeSince(mark, 'export:file-success');
    } catch (err) {
      const result: {
        kind: 'error';
        error: Error;
      } = {
        kind: 'error',
        error: err,
      };
      // Show the error in UI.
      this.setState({result});
      this.props.logger.trackTimeSince(mark, 'export:file-error', result);
      console.error('Failed to export to file: ', err);
    }
  }

  renderSuccess() {
    const {title, errorArray} = displayFetchMetadataErrors(
      this.state.fetchMetaDataErrors,
    );

    return (
      <Container>
        <FlexColumn>
          <Title bold>Data Exported Successfully</Title>
          <InfoText>
            When sharing your Flipper data, consider that the captured data
            might contain sensitive information like access tokens used in
            network requests.
          </InfoText>
          <ShareSheetErrorList
            errors={errorArray}
            title={title}
            type={'warning'}
          />
        </FlexColumn>
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={() => this.cancelAndHide()}>
            Close
          </Button>
        </FlexRow>
      </Container>
    );
  }

  renderError(result: {kind: 'error'; error: Error}) {
    return (
      <Container>
        <Title bold>Error</Title>
        <ErrorMessage code>
          {result.error.message || 'File could not be saved.'}
        </ErrorMessage>
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={() => this.cancelAndHide()}>
            Close
          </Button>
        </FlexRow>
      </Container>
    );
  }

  renderPending(statusUpdate: string | null) {
    return (
      <ShareSheetPendingDialog
        width={500}
        statusUpdate={statusUpdate}
        statusMessage="Creating Flipper Export..."
        onCancel={() => this.cancelAndHide()}
      />
    );
  }

  cancelAndHide = () => {
    this.props.onHide();
    this.idler.cancel();
  };

  renderStatus() {
    const {result, statusUpdate} = this.state;
    switch (result.kind) {
      case 'success':
        return this.renderSuccess();
      case 'error':
        return this.renderError(result);
      case 'pending':
        return this.renderPending(statusUpdate);
    }
  }

  render() {
    return (
      <Modal open onCancel={this.cancelAndHide} footer={null}>
        {this.renderStatus()}
      </Modal>
    );
  }
}
