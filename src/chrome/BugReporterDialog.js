/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BugReporter from '../fb-stubs/BugReporter.js';
import {Component} from 'react';
import {
  Button,
  colors,
  Link,
  Input,
  FlexColumn,
  FlexRow,
  Textarea,
  Text,
  FlexCenter,
  styled,
} from 'sonar';

const Container = FlexColumn.extends({
  padding: 10,
});

const textareaStyle = {
  margin: 0,
  marginBottom: 10,
};

const DialogContainer = styled.view({
  width: 400,
  height: 300,
  position: 'absolute',
  left: '50%',
  marginLeft: -200,
  top: 40,
  zIndex: 999999,
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  borderTop: 'none',
  borderBottomLeftRadius: 5,
  borderBottomRightRadius: 5,
  boxShadow: '0 1px 10px rgba(0, 0, 0, 0.1)',
});

const TitleInput = Input.extends({
  ...textareaStyle,
  height: 30,
});

const DescriptionTextarea = Textarea.extends({
  ...textareaStyle,
  flexGrow: 1,
});

const SubmitButtonContainer = styled.view({
  marginLeft: 'auto',
});

const Footer = FlexRow.extends({
  lineHeight: '24px',
});

const CloseDoneButton = Button.extends({
  width: 50,
  margin: '10px auto',
});

type State = {
  description: string,
  title: string,
  submitting: boolean,
  success: false | number, // false if not created, id of bug if it's been created
  error: ?string,
};

type Props = {
  bugReporter: BugReporter,
  close: () => void,
};

const DEFAULT_DESCRIPTION = `Thanks for taking the time to provide feedback!
Please fill out the following information to make addressing your issue easier.

What device platform are you using? ios/android
What sort of device are you using? emulator/physical
What app are you trying to use? wilde, fb4a, lite etc
Describe your problem in as much detail as possible: `;

export default class BugReporterDialog extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      description: DEFAULT_DESCRIPTION,
      title: '',
      submitting: false,
      success: false,
      error: null,
    };
  }

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
    this.props.close();
  };

  render() {
    let content;

    const {title, success, error, description} = this.state;

    if (success) {
      content = (
        <FlexCenter fill={true}>
          <FlexColumn>
            <Text>
              <Text>Bug </Text>

              <Text bold={true}>
                <Link
                  href={`https://our.intern.facebook.com/intern/bug/${success}`}>
                  {success}
                </Link>
              </Text>

              <Text> created. Thank you for the report!</Text>
            </Text>

            <CloseDoneButton onClick={this.onCancel}>Close</CloseDoneButton>
          </FlexColumn>
        </FlexCenter>
      );
    } else {
      content = (
        <Container fill={true}>
          <TitleInput
            placeholder="Title..."
            value={title}
            innerRef={this.setTitleRef}
            onChange={this.onTitleChange}
          />

          <DescriptionTextarea
            placeholder="Description..."
            value={description}
            innerRef={this.setDescriptionRef}
            onChange={this.onDescriptionChange}
          />

          <Footer>
            {error != null && <Text color={colors.red}>{error}</Text>}
            <SubmitButtonContainer>
              <Button type="primary" onClick={this.onSubmit}>
                Submit report
              </Button>
              <Button type="danger" onClick={this.onCancel}>
                Cancel
              </Button>
            </SubmitButtonContainer>
          </Footer>
        </Container>
      );
    }

    return <DialogContainer>{content}</DialogContainer>;
  }
}
