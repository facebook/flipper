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
import PropTypes from 'prop-types';
import {clipboard} from 'electron';
import ShareSheetErrorList from './ShareSheetErrorList';
import {reportPlatformFailures} from '../utils/metrics';
import CancellableExportStatus from './CancellableExportStatus';
import {performance} from 'perf_hooks';
import ShareSheetPendingDialog from './ShareSheetPendingDialog';
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
};

type State = {
  runInBackground: boolean;
  errorArray: Array<Error>;
  result: DataExportError | DataExportResult | null;
  statusUpdate: string | null;
};

export default class ShareSheetExportUrl extends Component<Props, State> {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  state: State = {
    errorArray: [],
    result: null,
    statusUpdate: null,
    runInBackground: false,
  };

  idler = new Idler();

  dispatchAndUpdateToolBarStatus(msg: string) {
    this.context.store.dispatch(
      setExportStatusComponent(
        <CancellableExportStatus
          msg={msg}
          onCancel={() => {
            this.idler.cancel();
            this.context.store.dispatch(unsetShare());
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
        exportStore(this.context.store, this.idler, statusUpdate),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI_LINK`,
      );

      statusUpdate('Uploading Flipper Trace...');
      // TODO(T55169042): Implement error handling. Result is not tested
      // its result type right now, causing the upload indicator to stall forever.
      const result = await reportPlatformFailures(
        shareFlipperData(serializedString),
        `${SHARE_FLIPPER_TRACE_EVENT}`,
      );

      this.setState({errorArray, result});
      const flipperUrl = (result as DataExportResult).flipperUrl;
      if (flipperUrl) {
        clipboard.writeText(String(flipperUrl));
        this.context.store.dispatch(setExportURL(flipperUrl));
        new Notification('Sharable Flipper trace created', {
          body: 'URL copied to clipboard',
          requireInteraction: true,
        });
      }
      this.props.logger.trackTimeSince(mark, 'export:url-success');
    } catch (e) {
      if (!this.state.runInBackground) {
        const result: DataExportError = {
          error_class: 'EXPORT_ERROR',
          error: '',
          stacktrace: '',
        };

        if (e instanceof Error) {
          result.error = e.message;
          result.stacktrace = e.stack || '';
        } else {
          result.error = e;
        }
        this.setState({result});
      }
      this.context.store.dispatch(unsetShare());
      this.props.logger.trackTimeSince(mark, 'export:url-error');
    }
  }

  renderPending(cancelAndHide: () => void, statusUpdate: string | null) {
    return (
      <ShareSheetPendingDialog
        statusUpdate={statusUpdate}
        statusMessage="Uploading Flipper trace..."
        onCancel={cancelAndHide}
        onRunInBackground={() => {
          this.setState({runInBackground: true});
          if (statusUpdate) {
            this.dispatchAndUpdateToolBarStatus(statusUpdate);
          }
          this.props.onHide();
        }}
      />
    );
  }

  render() {
    const cancelAndHide = () => {
      this.context.store.dispatch(unsetShare());
      this.props.onHide();
      this.idler.cancel();
    };
    const {result, statusUpdate, errorArray} = this.state;
    if (!result || !(result as DataExportResult).flipperUrl) {
      return this.renderPending(cancelAndHide, statusUpdate);
    }

    return (
      <Container>
        <>
          <FlexColumn>
            {(result as DataExportResult).flipperUrl ? (
              <>
                <Title bold>Data Upload Successful</Title>
                <InfoText>
                  Flipper's data was successfully uploaded. This URL can be used
                  to share with other Flipper users. Opening it will import the
                  data from your trace.
                </InfoText>
                <Copy value={(result as DataExportResult).flipperUrl} />
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
            <Button compact padded onClick={cancelAndHide}>
              Close
            </Button>
          </FlexRow>
        </>
      </Container>
    );
  }
}
