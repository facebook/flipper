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
import {
  exportStoreToFile,
  EXPORT_FLIPPER_TRACE_EVENT,
} from '../utils/exportData.js';
import PropTypes from 'prop-types';

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

const Padder = styled('div')(
  ({paddingLeft, paddingRight, paddingBottom, paddingTop}) => ({
    paddingLeft: paddingLeft || 0,
    paddingRight: paddingRight || 0,
    paddingBottom: paddingBottom || 0,
    paddingTop: paddingTop || 0,
  }),
);

type Props = {
  onHide: () => mixed,
  file: string,
};
type State = {
  errorArray: Array<Error>,
  result: ?{
    success: boolean,
    error: ?Error,
  },
};

export default class ShareSheetExportFile extends Component<Props, State> {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  state = {
    errorArray: [],
    result: null,
  };

  async componentDidMount() {
    try {
      const {errorArray} = await reportPlatformFailures(
        exportStoreToFile(this.props.file, this.context.store),
        `${EXPORT_FLIPPER_TRACE_EVENT}:UI`,
      );
      this.setState({errorArray, result: {success: true, error: null}});
    } catch (err) {
      this.setState({errorArray: [], result: {success: false, error: err}});
    }
  }

  render() {
    const {result} = this.state;
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
              {this.state.errorArray.length > 0 && (
                <Padder paddingBottom={8}>
                  <FlexColumn>
                    <Title bold>Errors: </Title>
                    {this.state.errorArray.map((e: Error) => {
                      return <ErrorMessage code>{e.toString()}</ErrorMessage>;
                    })}
                  </FlexColumn>
                </Padder>
              )}
            </FlexColumn>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={this.props.onHide}>
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
              <Button compact padded onClick={this.props.onHide}>
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
            <Uploading bold color={colors.macOSTitleBarIcon}>
              Exporting Flipper trace...
            </Uploading>
          </Center>
        </Container>
      );
    }
  }
}
