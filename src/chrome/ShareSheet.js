/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  FlexColumn,
  Button,
  styled,
  colors,
  Text,
  LoadingIndicator,
  Component,
  FlexRow,
  Spacer,
  Input,
} from 'flipper';
import {setExportStatusComponent, unsetShare} from '../reducers/application';
import type {Logger} from '../fb-interfaces/Logger.js';
import {Idler} from '../utils/Idler';
import {shareFlipperData} from '../fb-stubs/user';
import {exportStore, EXPORT_FLIPPER_TRACE_EVENT} from '../utils/exportData.js';
import PropTypes from 'prop-types';
import {clipboard} from 'electron';
import ShareSheetErrorList from './ShareSheetErrorList.js';
import {reportPlatformFailures} from '../utils/metrics';
import CancellableExportStatus from './CancellableExportStatus';
// $FlowFixMe: Missing type defs for node built-in.
import {performance} from 'perf_hooks';
export const SHARE_FLIPPER_TRACE_EVENT = 'share-flipper-link';

const Container = styled(FlexColumn)({
  padding: 20,
  width: 500,
});

const Center = styled(FlexColumn)({
  alignItems: 'center',
  paddingTop: 50,
  paddingBottom: 50,
});

const Uploading = styled(Text)({
  marginTop: 15,
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
  onHide: () => mixed,
  logger: Logger,
};
type State = {
  runInBackground: boolean,
  errorArray: Array<Error>,
  result:
    | ?{
        error_class: string,
        error: string,
      }
    | {
        flipperUrl: string,
      },
  statusUpdate: ?string,
};

export default class ShareSheet extends Component<Props, State> {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  state = {
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
      const {serializedString, errorArray} = await reportPlatformFailures(
        exportStore(this.context.store, this.idler, (msg: string) => {
          if (this.state.runInBackground) {
            this.dispatchAndUpdateToolBarStatus(msg);
          } else {
            this.setState({statusUpdate: msg});
          }
        }),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI_LINK`,
      );

      this.context.store.dispatch(unsetShare());

      const result = await reportPlatformFailures(
        shareFlipperData(serializedString),
        `${SHARE_FLIPPER_TRACE_EVENT}`,
      );

      this.setState({errorArray, result});
      if (result.flipperUrl) {
        clipboard.writeText(String(result.flipperUrl));
        new window.Notification('Sharable Flipper trace created', {
          body: 'URL copied to clipboard',
          requireInteraction: true,
        });
      }
      this.props.logger.trackTimeSince(mark, 'export:url-success');
    } catch (e) {
      const str = e instanceof Error ? e.toString() : e;
      this.setState({
        result: {
          error_class: 'EXPORT_ERROR',
          error: str,
        },
      });
      this.props.logger.trackTimeSince(mark, 'export:url-error');
    }
  }

  renderTheProgessState(onHide: () => void, statusUpdate: ?string) {
    return (
      <Container>
        <FlexColumn>
          <Center>
            <LoadingIndicator size={30} />
            {statusUpdate && statusUpdate.length > 0 ? (
              <Uploading bold color={colors.macOSTitleBarIcon}>
                {statusUpdate}
              </Uploading>
            ) : (
              <Uploading bold color={colors.macOSTitleBarIcon}>
                Uploading Flipper trace...
              </Uploading>
            )}
          </Center>
          <FlexRow>
            <Spacer />
            <Button
              compact
              padded
              onClick={() => {
                this.setState({runInBackground: true});
                const {statusUpdate} = this.state;
                if (statusUpdate) {
                  this.dispatchAndUpdateToolBarStatus(statusUpdate);
                }
                this.props.onHide();
              }}>
              Run In Background
            </Button>
            <Button compact padded onClick={onHide}>
              Close
            </Button>
          </FlexRow>
        </FlexColumn>
      </Container>
    );
  }

  render() {
    const onHide = () => {
      this.props.onHide();
      this.idler.cancel();
    };
    const {result, statusUpdate, errorArray} = this.state;
    if (!result || !result.flipperUrl) {
      return this.renderTheProgessState(onHide, statusUpdate);
    }
    return (
      <Container>
        <>
          <FlexColumn>
            {result.flipperUrl ? (
              <>
                <Title bold>Data Upload Successful</Title>
                <InfoText>
                  Flipper's data was successfully uploaded. This URL can be used
                  to share with other Flipper users. Opening it will import the
                  data from your trace.
                </InfoText>
                <Copy value={result.flipperUrl} />
                <InfoText>
                  When sharing your Flipper link, consider that the captured
                  data might contain sensitve information like access tokens
                  used in network requests.
                </InfoText>
                <ShareSheetErrorList errors={errorArray} />
              </>
            ) : (
              <>
                <Title bold>{result.error_class || 'Error'}</Title>
                <ErrorMessage code>
                  {result.error || 'The data could not be uploaded'}
                </ErrorMessage>
              </>
            )}
          </FlexColumn>
          <FlexRow>
            <Spacer />
            <Button compact padded onClick={onHide}>
              Close
            </Button>
          </FlexRow>
        </>
      </Container>
    );
  }
}
