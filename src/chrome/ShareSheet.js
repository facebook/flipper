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
import {shareFlipperData} from '../fb-stubs/user';
import {exportStore} from '../utils/exportData.js';
import PropTypes from 'prop-types';
import {clipboard} from 'electron';

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

const Copy = styled(Input)({
  marginRight: 0,
  marginBottom: 15,
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
};
type State = {
  result:
    | ?{
        error_class: string,
        error: string,
      }
    | {
        flipperUrl: string,
      },
};

export default class ShareSheet extends Component<Props, State> {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  state = {
    result: null,
  };

  async componentDidMount() {
    const storeData = await exportStore(this.context.store);
    const result = await shareFlipperData(storeData);
    this.setState({result});

    if (result.flipperUrl) {
      clipboard.writeText(String(result.flipperUrl));
      new window.Notification('Sharable Flipper trace created', {
        body: 'URL copied to clipboard',
        requireInteraction: true,
      });
    }
  }

  render() {
    return (
      <Container>
        {this.state.result ? (
          <>
            <FlexColumn>
              {this.state.result.flipperUrl ? (
                <>
                  <Title bold>Data Upload Successful</Title>
                  <InfoText>
                    Flipper's data was successfully uploaded. This URL can be
                    used to share with other Flipper users. Opening it will
                    import the data from your trace.
                  </InfoText>
                  <Copy value={this.state.result.flipperUrl} />
                  <InfoText>
                    When sharing your Flipper link, consider that the captured
                    data might contain sensitve information like access tokens
                    used in network requests.
                  </InfoText>
                </>
              ) : (
                <>
                  <Title bold>{this.state.result.error_class || 'Error'}</Title>
                  <ErrorMessage code>
                    {this.state.result.error ||
                      'The data could not be uploaded'}
                  </ErrorMessage>
                </>
              )}
            </FlexColumn>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={this.props.onHide}>
                Close
              </Button>
            </FlexRow>
          </>
        ) : (
          <Center>
            <LoadingIndicator size={30} />
            <Uploading bold color={colors.macOSTitleBarIcon}>
              Uploading Flipper trace...
            </Uploading>
          </Center>
        )}
      </Container>
    );
  }
}
