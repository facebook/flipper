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
  Button,
  styled,
  Text,
  FlexRow,
  Spacer,
  Input,
} from 'flipper';
import React, {Component} from 'react';
import {ReactReduxContext} from 'react-redux';
import {
  setExportStatusComponent,
  unsetShare,
  setExportURL,
} from '../reducers/application';
import {Logger} from '../fb-interfaces/Logger';
import {Idler} from '../utils/Idler';
import {
  shareFlipperData,
  DataExportResult,
  DataExportError,
} from '../fb-stubs/user';
import {exportStore, EXPORT_FLIPPER_TRACE_EVENT} from '../utils/exportData';
import {clipboard} from 'electron';
import ShareSheetErrorList from './ShareSheetErrorList';
import {reportPlatformFailures} from '../utils/metrics';
import CancellableExportStatus from './CancellableExportStatus';
import {performance} from 'perf_hooks';
import ShareSheetPendingDialog from './ShareSheetPendingDialog';
import {getInstance as getLogger} from '../fb-stubs/Logger';
import {resetSupportFormV2State} from '../reducers/supportForm';
import {MiddlewareAPI} from '../reducers/index';

export const SHARE_FLIPPER_TRACE_EVENT = 'share-flipper-link';

const Container = styled(FlexColumn)({
  padding: 20,
  width: 500,
});

const Copy = styled(Input)({
  marginRight: 0,
  marginBottom: 15,
});

const InfoText = styled(Text)({
  lineHeight: 1.35,
  marginBottom: 15,
});

const Title = styled(Text)({
  marginBottom: 6,
});

const ErrorMessage = styled(Text)({
  display: 'block',
  marginTop: 6,
  wordBreak: 'break-all',
  whiteSpace: 'pre-line',
  lineHeight: 1.35,
});

type Props = {
  onHide: () => any;
  logger: Logger;
  closeOnFinish: boolean;
};

type State = {
  runInBackground: boolean;
  errorArray: Array<Error>;
  result: DataExportError | DataExportResult | null;
  statusUpdate: string | null;
};

export default class ShareSheetExportUrl extends Component<Props, State> {
  static contextType = ReactReduxContext;

  state: State = {
    errorArray: [],
    result: null,
    statusUpdate: null,
    runInBackground: false,
  };

  get store(): MiddlewareAPI {
    return this.context.store;
  }

  idler = new Idler();

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
    const mark = 'shareSheetExportUrl';
    performance.mark(mark);
    try {
      const statusUpdate = (msg: string) => {
        if (this.state.runInBackground) {
          this.dispatchAndUpdateToolBarStatus(msg);
        } else {
          this.setState({statusUpdate: msg});
        }
      };
      const {serializedString, errorArray} = await reportPlatformFailures(
        exportStore(this.store, false, this.idler, statusUpdate),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI_LINK`,
      );
      const uploadMarker = `${EXPORT_FLIPPER_TRACE_EVENT}:upload`;
      performance.mark(uploadMarker);
      statusUpdate('Uploading Flipper Trace...');
      const result = await reportPlatformFailures(
        shareFlipperData(serializedString),
        `${SHARE_FLIPPER_TRACE_EVENT}`,
      );

      if ((result as DataExportError).error != undefined) {
        const res = result as DataExportError;
        const err = new Error(res.error);
        err.stack = res.stacktrace;
        throw err;
      }
      getLogger().trackTimeSince(uploadMarker, uploadMarker, {
        plugins: this.store.getState().plugins.selectedPlugins,
      });
      this.setState({errorArray, result});
      const flipperUrl = (result as DataExportResult).flipperUrl;
      if (flipperUrl) {
        clipboard.writeText(String(flipperUrl));
        this.store.dispatch(setExportURL(flipperUrl));
        new Notification('Sharable Flipper trace created', {
          body: 'URL copied to clipboard',
          requireInteraction: true,
        });
      }
      this.store.dispatch(resetSupportFormV2State());
      this.props.logger.trackTimeSince(mark, 'export:url-success');
    } catch (e) {
      const result: DataExportError = {
        error_class: 'EXPORT_ERROR',
        error: e,
        stacktrace: '',
      };
      if (!this.state.runInBackground) {
        if (e instanceof Error) {
          result.error = e.message;
          result.stacktrace = e.stack || '';
        }
        // Show the error in UI.
        this.setState({result});
      }
      this.store.dispatch(unsetShare());
      this.props.logger.trackTimeSince(mark, 'export:url-error', result);
      throw e;
    }
  }

  sheetHidden: boolean = false;

  hideSheet = () => {
    this.sheetHidden = true;
    this.props.onHide();
    this.idler.cancel();
  };

  componentDidUpdate() {
    const {result} = this.state;
    if (!result || !(result as DataExportResult).flipperUrl) {
      return;
    }
    if (!this.sheetHidden && this.props.closeOnFinish) {
      this.hideSheet();
    }
  }

  cancelAndHide = (store: MiddlewareAPI) => () => {
    store.dispatch(unsetShare());
    this.hideSheet();
  };

  renderPending(statusUpdate: string | null) {
    return (
      <ReactReduxContext.Consumer>
        {({store}) => (
          <ShareSheetPendingDialog
            width={500}
            statusUpdate={statusUpdate}
            statusMessage="Uploading Flipper trace..."
            onCancel={this.cancelAndHide(store)}
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

  render() {
    const {result, statusUpdate, errorArray} = this.state;
    if (!result) {
      return this.renderPending(statusUpdate);
    }

    return (
      <ReactReduxContext.Consumer>
        {({store}) => (
          <Container>
            <>
              <FlexColumn>
                {(result as DataExportResult).flipperUrl ? (
                  <>
                    <Title bold>Data Upload Successful</Title>
                    <InfoText>
                      Flipper's data was successfully uploaded. This URL can be
                      used to share with other Flipper users. Opening it will
                      import the data from your trace.
                    </InfoText>
                    <Copy
                      value={(result as DataExportResult).flipperUrl}
                      readOnly
                    />
                    <InfoText>
                      When sharing your Flipper link, consider that the captured
                      data might contain sensitve information like access tokens
                      used in network requests.
                    </InfoText>
                    <ShareSheetErrorList errors={errorArray} />
                  </>
                ) : (
                  <>
                    <Title bold>
                      {(result as DataExportError).error_class || 'Error'}
                    </Title>
                    <ErrorMessage code>
                      {(result as DataExportError).error ||
                        'The data could not be uploaded'}
                    </ErrorMessage>
                  </>
                )}
              </FlexColumn>
              <FlexRow>
                <Spacer />
                <Button compact padded onClick={this.cancelAndHide(store)}>
                  Close
                </Button>
              </FlexRow>
            </>
          </Container>
        )}
      </ReactReduxContext.Consumer>
    );
  }
}
