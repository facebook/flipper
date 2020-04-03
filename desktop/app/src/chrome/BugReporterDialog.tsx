/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BugReporter from '../fb-stubs/BugReporter';
import {FlipperPlugin, FlipperDevicePlugin} from '../plugin';
import React, {Fragment, Component} from 'react';
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
import {State as Store} from '../reducers';

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

const Title = styled.div({
  fontWeight: 500,
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

const SubmitButtonContainer = styled.div({
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

type State = {
  description: string;
  title: string;
  submitting: boolean;
  success: number | null | undefined;
  error: string | null | undefined;
};

type OwnProps = {
  bugReporter: BugReporter;
  onHide: () => any;
};

type DispatchFromProps = {};

type StateFromProps = {
  activePlugin:
    | typeof FlipperPlugin
    | typeof FlipperDevicePlugin
    | null
    | undefined;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class BugReporterDialog extends Component<Props, State> {
  state = {
    description: '',
    title: '',
    submitting: false,
    success: null,
    error: null,
  };

  titleRef?: HTMLElement | null;
  descriptionRef?: HTMLElement | null;

  onDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({description: e.target.value});
  };

  onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({title: e.target.value});
  };

  onSubmit = () => {
    // validate fields
    const {title, description} = this.state;
    if (!title) {
      this.setState({
        error: 'Title required.',
      });
      if (this.titleRef) {
        this.titleRef.focus();
      }
      return;
    }
    if (!description) {
      this.setState({
        error: 'Description required.',
      });
      if (this.descriptionRef) {
        this.descriptionRef.focus();
      }
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
              .catch((err) => {
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

  setTitleRef = (ref: HTMLElement | null) => {
    this.titleRef = ref;
  };

  setDescriptionRef = (ref: HTMLElement | null) => {
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
    const {activePlugin} = this.props;

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
          <Title>Report a bug in Flipper</Title>
          <TitleInput
            placeholder="Title"
            value={title}
            ref={this.setTitleRef}
            onChange={this.onTitleChange}
            disabled={submitting}
          />

          <DescriptionTextarea
            placeholder="Describe your problem in as much detail as possible."
            value={description}
            ref={this.setDescriptionRef}
            onChange={this.onDescriptionChange}
            disabled={submitting}
          />
          {activePlugin && activePlugin.bugs && (
            <InfoBox>
              <Icon color={colors.light50} name="info-circle" />
              <span>
                If your bug is related to the{' '}
                <strong>
                  {(activePlugin && activePlugin.title) || activePlugin.id}{' '}
                  plugin
                </strong>
                {activePlugin && activePlugin.bugs && activePlugin.bugs.url && (
                  <span>
                    , you might find useful information about it here:{' '}
                    <Link href={activePlugin.bugs.url || ''}>
                      {activePlugin.bugs.url}
                    </Link>
                  </span>
                )}
                {activePlugin && activePlugin.bugs && activePlugin.bugs.email && (
                  <span>
                    , you might also want contact{' '}
                    <Link href={'mailto:' + String(activePlugin.bugs.email)}>
                      {activePlugin.bugs.email}
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

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    plugins: {devicePlugins, clientPlugins},
    connections: {selectedPlugin},
  }) => ({
    activePlugin: selectedPlugin
      ? devicePlugins.get(selectedPlugin) || clientPlugins.get(selectedPlugin)
      : null,
  }),
)(BugReporterDialog);
