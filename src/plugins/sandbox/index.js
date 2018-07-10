/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {SonarPlugin} from 'sonar';
import {FlexColumn} from 'sonar';
import {ButtonGroup, Button, styled, colors} from 'sonar';

export type Sandbox = {
  name: string,
  value: string,
};

type SandboxState = {|
  sandboxes: Array<Sandbox>,
  customSandbox: string,
  showFeedback: boolean,
|};

const BigButton = Button.extends({
  flexGrow: 1,
  fontSize: 24,
  padding: 20,
});

const ButtonContainer = FlexColumn.extends({
  alignItems: 'center',
  padding: 20,
});

export default class SandboxView extends SonarPlugin<SandboxState> {
  state = {
    sandboxes: [],
    customSandbox: '',
    showFeedback: false,
  };

  static title = 'Sandbox';
  static id = 'Sandbox';
  static icon = 'translate';

  static TextInput = styled.textInput({
    border: `1px solid ${colors.light10}`,
    fontSize: '1em',
    padding: '0 5px',
    borderRight: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    flexGrow: 1,
  });

  static FeedbackMessage = styled.text({
    fontSize: '1.2em',
    paddingTop: '10px',
    color: 'green',
  });

  static TextInputLayout = FlexColumn.extends({
    float: 'left',
    justifyContent: 'center',
    flexGrow: 1,
    borderRadius: 4,
    marginRight: 15,
    marginTop: 15,
    marginLeft: 15,
  });

  reducers = {
    UpdateSandboxes(state: SandboxState, results: Object) {
      return {
        sandboxes: results.results,
      };
    },
  };

  init() {
    this.client.call('getSandbox', {}).then((results: Array<Sandbox>) => {
      this.dispatchAction({results, type: 'UpdateSandboxes'});
    });
  }

  onSendSandboxEnvironment = (sandbox: string) => {
    this.client
      .call('setSandbox', {
        sandbox: sandbox,
      })
      .then((result: Object) => {
        setTimeout(() => {
          this.setState({showFeedback: false});
        }, 3000);
        this.setState({showFeedback: result.result});
      });
  };

  onChangeSandbox = (e: SyntheticInputEvent<>) => {
    this.setState({customSandbox: e.target.value});
  };

  render() {
    return (
      <FlexColumn>
        <SandboxView.TextInputLayout>
          <ButtonGroup flexGrow={1}>
            <SandboxView.TextInput
              type="text"
              placeholder="Sandbox URL (e.g. unixname.sb.facebook.com)"
              key="sandbox-url"
              onChange={this.onChangeSandbox}
              onKeyPress={event => {
                if (event.key === 'Enter') {
                  this.onSendSandboxEnvironment(this.state.customSandbox);
                }
              }}
            />
            <Button
              key="sandbox-send"
              icon="download"
              onClick={() =>
                this.onSendSandboxEnvironment(this.state.customSandbox)
              }
              disabled={this.state.customSandbox == null}
            />
          </ButtonGroup>
          <SandboxView.FeedbackMessage
            hidden={this.state.showFeedback == false}>
            Success!
          </SandboxView.FeedbackMessage>
        </SandboxView.TextInputLayout>
        {this.state.sandboxes.map(sandbox => (
          <ButtonContainer>
            <BigButton
              key={sandbox.value}
              onClick={() => this.onSendSandboxEnvironment(sandbox.value)}>
              {sandbox.name}
            </BigButton>
          </ButtonContainer>
        ))}
      </FlexColumn>
    );
  }
}
