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
} from 'flipper';
import {reportPlatformFailures} from '../utils/metrics';
// $FlowFixMe: Missing type defs for node built-in.
import {performance} from 'perf_hooks';
import type {Logger} from '../fb-interfaces/Logger.js';
import {Idler} from '../utils/Idler';
import {
  exportStoreToFile,
  EXPORT_FLIPPER_TRACE_EVENT,
} from '../utils/exportData.js';
import PropTypes from 'prop-types';
import ShareSheetErrorList from './ShareSheetErrorList.js';

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
  onHide: () => mixed,
  file: ?string,
  logger: Logger,
};

type State = {
  errorArray: Array<Error>,
  result: ?{
    success: boolean,
    error: ?Error,
  },
  statusUpdate: ?string,
};

export default class ShareSheetExportFile extends Component<Props, State> {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  state = {
    errorArray: [],
    result: null,
    statusUpdate: null,
  };

  idler = new Idler();

  async componentDidMount() {
    const mark = 'shareSheetExportFile';
    performance.mark(mark);
    try {
      // Flow doesn't allow us to check for this earlier because `performance` is untyped
      // and could presumably do anything.
      if (!this.props.file) {
        return;
      }
      const {errorArray} = await reportPlatformFailures(
        exportStoreToFile(
          this.props.file,
          this.context.store,
          this.idler,
          (msg: string) => {
            this.setState({statusUpdate: msg});
          },
        ),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI_FILE`,
      );
      this.setState({errorArray, result: {success: true, error: null}});
      this.props.logger.trackTimeSince(mark, 'export:file-success');
    } catch (err) {
      this.setState({errorArray: [], result: {success: false, error: err}});
      this.props.logger.trackTimeSince(mark, 'export:file-error');
    }
  }

  render() {
    const onHide = () => {
      this.props.onHide();
      this.idler.cancel();
    };

    if (!this.props.file) {
      return this.renderNoFileError(onHide);
    }
    const {result, statusUpdate} = this.state;
    if (result) {
      const {success, error} = result;
      if (success) {
        return (
          <Container>
            <FlexColumn>
              <Title bold>Data Exported Successfully</Title>
              <InfoText>
                When sharing your Flipper data, consider that the captured data
                might contain sensitive information like access tokens used in
                network requests.
              </InfoText>
              <ShareSheetErrorList errors={this.state.errorArray} />
            </FlexColumn>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={onHide}>
                Close
              </Button>
            </FlexRow>
          </Container>
        );
      }
      if (error) {
        return (
          <Container>
            <Title bold>Error</Title>
            <ErrorMessage code>
              {error?.message || 'File could not be saved.'}
            </ErrorMessage>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={onHide}>
                Close
              </Button>
            </FlexRow>
          </Container>
        );
      }
      return null;
    } else {
      return (
        <Container>
          <Center>
            <LoadingIndicator size={30} />
            {statusUpdate && statusUpdate.length > 0 ? (
              <Uploading bold color={colors.macOSTitleBarIcon}>
                {statusUpdate}
              </Uploading>
            ) : (
              <Uploading bold color={colors.macOSTitleBarIcon}>
                Exporting Flipper trace...
              </Uploading>
            )}
          </Center>
          <FlexRow>
            <Spacer />
            <Button compact padded onClick={onHide}>
              Cancel
            </Button>
          </FlexRow>
        </Container>
      );
    }
  }

  renderNoFileError(onHide: () => void) {
    return (
      <Container>
        <Center>
          <Title bold>No file selected</Title>
        </Center>
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={onHide}>
            Close
          </Button>
        </FlexRow>
      </Container>
    );
  }
}
