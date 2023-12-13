/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, styled, Text, FlexRow, Spacer, Input} from '../ui';
import React, {Component} from 'react';
import {ReactReduxContext, ReactReduxContextValue} from 'react-redux';
import {Logger} from 'flipper-common';
import {IdlerImpl} from '../utils/Idler';
import {
  DataExportResult,
  DataExportError,
  shareFlipperData,
} from '../fb-stubs/user';
import {
  exportStore,
  EXPORT_FLIPPER_TRACE_EVENT,
  displayFetchMetadataErrors,
} from '../utils/exportData';
import ShareSheetErrorList from './ShareSheetErrorList';
import {reportPlatformFailures} from 'flipper-common';
import ShareSheetPendingDialog from './ShareSheetPendingDialog';
import {getLogger} from 'flipper-common';
import {MiddlewareAPI} from '../reducers/index';
import {getFlipperLib, Layout} from 'flipper-plugin';
import {Button, Modal} from 'antd';

export const SHARE_FLIPPER_TRACE_EVENT = 'share-flipper-link';

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
  fetchMetaDataErrors: {
    [plugin: string]: Error;
  } | null;
  result: DataExportError | DataExportResult | null;
  statusUpdate: string | null;
};

export default class ShareSheetExportUrl extends Component<Props, State> {
  static contextType: React.Context<ReactReduxContextValue> = ReactReduxContext;

  state: State = {
    fetchMetaDataErrors: null,
    result: null,
    statusUpdate: null,
  };

  get store(): MiddlewareAPI {
    return this.context.store;
  }

  idler = new IdlerImpl();

  async componentDidMount() {
    const mark = 'shareSheetExportUrl';
    performance.mark(mark);
    try {
      const statusUpdate = (msg: string) => {
        this.setState({statusUpdate: msg});
      };
      const {serializedString, fetchMetaDataErrors} =
        await reportPlatformFailures(
          exportStore(this.store, false, this.idler, statusUpdate),
          `${EXPORT_FLIPPER_TRACE_EVENT}:UI_LINK`,
        );
      const uploadMarker = `${EXPORT_FLIPPER_TRACE_EVENT}:upload`;
      performance.mark(uploadMarker);
      statusUpdate('Uploading Flipper Export...');
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
      const flipperUrl = (result as DataExportResult).flipperUrl;
      if (flipperUrl) {
        getFlipperLib().writeTextToClipboard(String(flipperUrl));
        new Notification('Shareable Flipper Export created', {
          body: 'URL copied to clipboard',
          requireInteraction: true,
        });
      }
      this.setState({fetchMetaDataErrors, result});
      this.props.logger.trackTimeSince(mark, 'export:url-success');
    } catch (e) {
      const result: DataExportError = {
        error_class: 'EXPORT_ERROR',
        error: e,
        stacktrace: '',
      };
      if (e instanceof Error) {
        result.error = e.message;
        result.stacktrace = e.stack || '';
      }
      // Show the error in UI.
      this.setState({result});
      this.props.logger.trackTimeSince(mark, 'export:url-error', result);
      console.error('Failed to export to flipper trace', e);
    }
  }

  componentDidUpdate() {
    const {result} = this.state;
    if (!result || !(result as DataExportResult).flipperUrl) {
      return;
    }
  }

  cancelAndHide = () => {
    this.props.onHide();
    this.idler.cancel();
  };

  renderPending(statusUpdate: string | null) {
    return (
      <Modal open onCancel={this.cancelAndHide} footer={null}>
        <ShareSheetPendingDialog
          width={500}
          statusUpdate={statusUpdate}
          statusMessage="Uploading Flipper Export..."
          onCancel={this.cancelAndHide}
        />
      </Modal>
    );
  }

  render() {
    const {result, statusUpdate, fetchMetaDataErrors} = this.state;
    if (!result) {
      return this.renderPending(statusUpdate);
    }

    const {title, errorArray} = displayFetchMetadataErrors(fetchMetaDataErrors);
    return (
      <Modal open onCancel={this.cancelAndHide} footer={null}>
        <Layout.Container>
          <>
            <FlexColumn>
              {(result as DataExportResult).flipperUrl ? (
                <>
                  <Title bold>Data Upload Successful</Title>
                  <InfoText>
                    Flipper's data was successfully uploaded. This URL can be
                    used to share with other Flipper users. Opening it will
                    import the data from your export.
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
                  <ShareSheetErrorList
                    errors={errorArray}
                    title={title}
                    type={'warning'}
                  />
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
              <Button type="primary" onClick={this.cancelAndHide}>
                Close
              </Button>
            </FlexRow>
          </>
        </Layout.Container>
      </Modal>
    );
  }
}
