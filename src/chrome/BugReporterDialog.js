/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BugReporter from '../fb-stubs/BugReporter.js';
import type {FlipperDevicePlugin, FlipperPlugin} from '../plugin';
import {Fragment, Component} from 'react';
import {connect} from 'react-redux';
import {
  Button,
  colors,
  Link,
  Input,
  FlexColumn,
  FlexRow,
  FlexCenter,
  Textarea,
  Text,
  Glyph,
  styled,
} from 'flipper';

const Container = styled(FlexColumn)({
  padding: 10,
  width: 400,
  height: 300,
});

const Icon = styled(Glyph)({
  marginRight: 8,
  marginLeft: 3,
});

const Center = styled(Text)({
  textAlign: 'center',
  lineHeight: '130%',
  paddingLeft: 20,
  paddingRight: 20,
});

const Title = styled('div')({
  fontWeight: '500',
  marginTop: 8,
  marginLeft: 2,
  marginBottom: 8,
});

const textareaStyle = {
  margin: 0,
  marginBottom: 10,
};

const TitleInput = styled(Input)({
  ...textareaStyle,
  height: 30,
});

const DescriptionTextarea = styled(Textarea)({
  ...textareaStyle,
  flexGrow: 1,
});

const SubmitButtonContainer = styled('div')({
  marginLeft: 'auto',
});

const Footer = styled(FlexRow)({
  lineHeight: '24px',
});

const CloseDoneButton = styled(Button)({
  marginTop: 20,
  marginLeft: 'auto !important',
  marginRight: 'auto',
});

const InfoBox = styled(FlexRow)({
  marginBottom: 20,
  lineHeight: '130%',
});

type State = {|
  description: string,
  title: string,
  submitting: boolean,
  success: ?number,
  error: ?string,
|};

type Props = {|
  bugReporter: BugReporter,
  activePlugin: ?Class<FlipperPlugin<> | FlipperDevicePlugin<>>,
  onHide: () => mixed,
|};

class BugReporterDialog extends Component<Props, State> {
  state = {
    description: '',
    title: '',
    submitting: false,
    success: null,
    error: null,
  };

  titleRef: HTMLElement;
  descriptionRef: HTMLElement;

  onDescriptionChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({description: e.target.value});
  };

  onTitleChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({title: e.target.value});
  };

  onSubmit = () => {
    // validate fields
    const {title, description} = this.state;
    if (!title) {
      this.setState({
        error: 'Title required.',
      });
      this.titleRef.focus();
      return;
    }
    if (!description) {
      this.setState({
        error: 'Description required.',
      });
      this.descriptionRef.focus();
      return;
    }

    this.setState(
      {
        error: null,
        submitting: true,
      },
      () => {
        // this will be called before the next repaint
        requestAnimationFrame(() => {
          // we have to call this again to ensure a repaint has actually happened
          // as requestAnimationFrame is called BEFORE a repaint, not after which
          // means we have to queue up twice to actually ensure a repaint has
          // happened
          requestAnimationFrame(() => {
            this.props.bugReporter
              .report(title, description)
              .then((id: number) => {
                this.setState({
                  submitting: false,
                  success: id,
                });
              })
              .catch(err => {
                this.setState({
                  error: err.message,
                  submitting: false,
                });
              });
          });
        });
      },
    );
  };

  setTitleRef = (ref: HTMLElement) => {
    this.titleRef = ref;
  };

  setDescriptionRef = (ref: HTMLElement) => {
    this.descriptionRef = ref;
  };

  onCancel = () => {
    this.setState({
      error: null,
      title: '',
      description: '',
    });
    this.props.onHide();
  };

  render() {
    let content;
    const {title, success, error, description, submitting} = this.state;

    if (success) {
      content = (
        <FlexCenter grow={true}>
          <FlexColumn>
            <Center>
              <Glyph
                name="checkmark-circle"
                size={24}
                variant="outline"
                color={colors.light30}
              />
              <br />
              <Title>Bug Report created</Title>
              The bug report{' '}
              <Link
                href={`https://our.intern.facebook.com/intern/bug/${success}`}>
                {success}
              </Link>{' '}
              was successfully created. Thank you for your help making Flipper
              better!
            </Center>
            <CloseDoneButton onClick={this.onCancel} compact type="primary">
              Close
            </CloseDoneButton>
          </FlexColumn>
        </FlexCenter>
      );
    } else {
      content = (
        <Fragment>
          <Title>Report a bug...</Title>
          <TitleInput
            placeholder="Title..."
            value={title}
            innerRef={this.setTitleRef}
            onChange={this.onTitleChange}
            disabled={submitting}
          />

          <DescriptionTextarea
            placeholder="Describe your problem in as much detail as possible..."
            value={description}
            innerRef={this.setDescriptionRef}
            onChange={this.onDescriptionChange}
            disabled={submitting}
          />
          {this.props.activePlugin?.bugs && (
            <InfoBox>
              <Icon color={colors.light50} name="info-circle" />
              <span>
                If you bug is related to the{' '}
                <strong>
                  {this.props.activePlugin?.title ||
                    this.props.activePlugin?.id}{' '}
                  plugin
                </strong>
                {this.props.activePlugin?.bugs?.url && (
                  <span>
                    , you might find useful information about it here:{' '}
                    <Link href={this.props.activePlugin?.bugs?.url || ''}>
                      {this.props.activePlugin?.bugs?.url}
                    </Link>
                  </span>
                )}
                {this.props.activePlugin?.bugs?.email && (
                  <span>
                    , you might also want contact{' '}
                    <Link
                      href={
                        'mailto:' + String(this.props.activePlugin?.bugs?.email)
                      }>
                      {this.props.activePlugin?.bugs?.email}
                    </Link>
                    , the author/oncall of this plugin, directly
                  </span>
                )}
                .
              </span>
            </InfoBox>
          )}

          <Footer>
            {error != null && <Text color={colors.red}>{error}</Text>}
            <SubmitButtonContainer>
              <Button
                onClick={this.onCancel}
                disabled={submitting}
                compact
                padded>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={this.onSubmit}
                disabled={submitting}
                compact
                padded>
                Submit Report
              </Button>
            </SubmitButtonContainer>
          </Footer>
        </Fragment>
      );
    }

    return <Container>{content}</Container>;
  }
}

// $FlowFixMe
export default connect(
  ({
    plugins: {devicePlugins, clientPlugins},
    connections: {selectedPlugin},
  }) => ({
    activePlugin:
      devicePlugins.get(selectedPlugin) || clientPlugins.get(selectedPlugin),
  }),
)(BugReporterDialog);
