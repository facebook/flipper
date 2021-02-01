/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled, Text, FlexRow, Spacer} from '../ui';
import React, {Component} from 'react';
import {setExportStatusComponent, unsetShare} from '../reducers/application';
import {reportPlatformFailures} from '../utils/metrics';
import CancellableExportStatus from './CancellableExportStatus';
import {performance} from 'perf_hooks';
import {Logger} from '../fb-interfaces/Logger';
import {IdlerImpl} from '../utils/Idler';
import {
  exportStoreToFile,
  EXPORT_FLIPPER_TRACE_EVENT,
  displayFetchMetadataErrors,
} from '../utils/exportData';
import ShareSheetErrorList from './ShareSheetErrorList';
import ShareSheetPendingDialog from './ShareSheetPendingDialog';
import {ReactReduxContext} from 'react-redux';
import {MiddlewareAPI} from '../reducers/index';

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
  file: string;
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
  runInBackground: boolean;
};

export default class ShareSheetExportFile extends Component<Props, State> {
  static contextType = ReactReduxContext;

  get store(): MiddlewareAPI {
    return this.context.store;
  }

  state: State = {
    fetchMetaDataErrors: null,
    result: {kind: 'pending'},
    statusUpdate: null,
    runInBackground: false,
  };

  idler = new IdlerImpl();

  dispatchAndUpdateToolBarStatus(msg: string) {
    this.store.dispatch(
      setExportStatusComponent(
        <CancellableExportStatus
          msg={msg}
          onCancel={() => {
            this.idler.cancel();
            this.store.dispatch(unsetShare());
          }}
        />,
      ),
    );
  }

  async componentDidMount() {
    const mark = 'shareSheetExportFile';
    performance.mark(mark);
    try {
      if (!this.props.file) {
        return;
      }
      const {fetchMetaDataErrors} = await reportPlatformFailures(
        exportStoreToFile(
          this.props.file,
          this.store,
          false,
          this.idler,
          (msg: string) => {
            if (this.state.runInBackground) {
              this.dispatchAndUpdateToolBarStatus(msg);
            } else {
              this.setState({statusUpdate: msg});
            }
          },
        ),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI_FILE`,
      );
      if (this.state.runInBackground) {
        new Notification('Shareable Flipper Export created', {
          body: `Saved to ${this.props.file}`,
          requireInteraction: true,
        });
      }
      this.setState({fetchMetaDataErrors, result: {kind: 'success'}});
      this.store.dispatch(unsetShare());
      this.props.logger.trackTimeSince(mark, 'export:file-success');
    } catch (err) {
      const result: {
        kind: 'error';
        error: Error;
      } = {
        kind: 'error',
        error: err,
      };
      if (!this.state.runInBackground) {
        // Show the error in UI.
        this.setState({result});
      }
      this.store.dispatch(unsetShare());
      this.props.logger.trackTimeSince(mark, 'export:file-error', result);
      throw err;
    }
  }

  renderSuccess() {
    const {title, errorArray} = displayFetchMetadataErrors(
      this.state.fetchMetaDataErrors,
    );

    return (
      <ReactReduxContext.Consumer>
        {({store}) => (
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
              <Button compact padded onClick={() => this.cancelAndHide(store)}>
                Close
              </Button>
            </FlexRow>
          </Container>
        )}
      </ReactReduxContext.Consumer>
    );
  }

  renderError(result: {kind: 'error'; error: Error}) {
    return (
      <ReactReduxContext.Consumer>
        {({store}) => (
          <Container>
            <Title bold>Error</Title>
            <ErrorMessage code>
              {result.error.message || 'File could not be saved.'}
            </ErrorMessage>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={() => this.cancelAndHide(store)}>
                Close
              </Button>
            </FlexRow>
          </Container>
        )}
      </ReactReduxContext.Consumer>
    );
  }

  renderPending(statusUpdate: string | null) {
    return (
      <ReactReduxContext.Consumer>
        {({store}) => (
          <ShareSheetPendingDialog
            width={500}
            statusUpdate={statusUpdate}
            statusMessage="Creating Flipper Export..."
            onCancel={() => this.cancelAndHide(store)}
            onRunInBackground={() => {
              this.setState({runInBackground: true});
              if (statusUpdate) {
                this.dispatchAndUpdateToolBarStatus(statusUpdate);
              }
              this.props.onHide();
            }}
          />
        )}
      </ReactReduxContext.Consumer>
    );
  }

  cancelAndHide(store: MiddlewareAPI) {
    store.dispatch(unsetShare());
    this.props.onHide();
    this.idler.cancel();
  }

  render() {
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
}
