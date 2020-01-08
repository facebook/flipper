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
  styled,
  Text,
  FlexRow,
  Glyph,
  LoadingIndicator,
  colors,
  Spacer,
  Button,
  FlexBox,
  Checkbox,
} from 'flipper';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {
  HealthcheckResult,
  HealthcheckReportCategory,
  HealthcheckReport,
  startHealthchecks,
  finishHealthchecks,
  updateHealthcheckResult,
  acknowledgeProblems,
  resetAcknowledgedProblems,
} from '../reducers/healthchecks';
import runHealthchecks, {
  HealthcheckSettings,
  HealthcheckEventsHandler,
} from '../utils/runHealthchecks';
import {shell} from 'electron';

type StateFromProps = {
  healthcheckReport: HealthcheckReport;
} & HealthcheckSettings;

type DispatchFromProps = {
  acknowledgeProblems: () => void;
  resetAcknowledgedProblems: () => void;
} & HealthcheckEventsHandler;

const Container = styled(FlexColumn)({
  padding: 20,
  width: 600,
});

const HealthcheckDisplayContainer = styled(FlexRow)({
  alignItems: 'center',
  marginBottom: 5,
});

const HealthcheckListContainer = styled(FlexColumn)({
  marginBottom: 20,
  width: 300,
});

const Title = styled(Text)({
  marginBottom: 18,
  marginRight: 10,
  fontWeight: 100,
  fontSize: '40px',
});

const CategoryContainer = styled(FlexColumn)({
  marginBottom: 5,
  marginLeft: 20,
  marginRight: 20,
});

const SideContainer = styled(FlexBox)({
  marginBottom: 20,
  padding: 20,
  backgroundColor: colors.highlightBackground,
  border: '1px solid #b3b3b3',
  width: 250,
});

const SideContainerText = styled(Text)({
  display: 'block',
  wordWrap: 'break-word',
});

const HealthcheckLabel = styled(Text)({
  paddingLeft: 5,
});

const SkipReasonLabel = styled(Text)({
  paddingLeft: 21,
  fontStyle: 'italic',
});

const CenteredContainer = styled.label({
  display: 'flex',
  alignItems: 'center',
});

type OwnProps = {
  onHide: () => void;
};

function CenteredCheckbox(props: {
  checked: boolean;
  text: string;
  onChange: (checked: boolean) => void;
}) {
  const {checked, onChange, text} = props;
  return (
    <CenteredContainer>
      <Checkbox checked={checked} onChange={onChange} />
      {text}
    </CenteredContainer>
  );
}

function HealthcheckIcon(props: {checkResult: HealthcheckResult}) {
  const {checkResult: check} = props;
  switch (props.checkResult.status) {
    case 'IN_PROGRESS':
      return <LoadingIndicator size={16} title={props.checkResult.message} />;
    case 'SKIPPED':
      return (
        <Glyph
          size={16}
          name={'question'}
          color={colors.grey}
          title={props.checkResult.message}
        />
      );
    case 'SUCCESS':
      return (
        <Glyph
          size={16}
          name={'checkmark'}
          color={colors.green}
          title={props.checkResult.message}
        />
      );
    case 'FAILED':
      return (
        <Glyph
          size={16}
          name={'cross'}
          color={colors.red}
          title={props.checkResult.message}
          variant={check.isAcknowledged ? 'outline' : 'filled'}
        />
      );
    default:
      return (
        <Glyph
          size={16}
          name={'caution'}
          color={colors.yellow}
          title={props.checkResult.message}
        />
      );
  }
}

function HealthcheckDisplay(props: {
  label: string;
  result: HealthcheckResult;
  onClick?: () => void;
}) {
  return (
    <FlexColumn shrink>
      <HealthcheckDisplayContainer shrink title={props.result.message}>
        <HealthcheckIcon checkResult={props.result} />
        <HealthcheckLabel
          underline={!!props.onClick}
          cursor={props.onClick && 'pointer'}
          onClick={props.onClick}>
          {props.label}
        </HealthcheckLabel>
      </HealthcheckDisplayContainer>
    </FlexColumn>
  );
}

function SideMessageDisplay(props: {
  isHealthcheckInProgress: boolean;
  hasProblems: boolean;
}) {
  if (props.isHealthcheckInProgress) {
    return (
      <SideContainerText selectable>
        Doctor is running healthchecks...
      </SideContainerText>
    );
  } else if (props.hasProblems) {
    return (
      <SideContainerText selectable>
        Doctor has discovered problems with your installation.
      </SideContainerText>
    );
  } else {
    return (
      <SideContainerText selectable>
        All good! Doctor has not discovered any issues with your installation.
      </SideContainerText>
    );
  }
}

function hasProblems(result: HealthcheckResult) {
  const {status} = result;
  return status === 'FAILED' || status === 'WARNING';
}

function hasNewProblems(result: HealthcheckResult) {
  return hasProblems(result) && !result.isAcknowledged;
}

export type State = {
  acknowledgeCheckboxVisible: boolean;
  acknowledgeOnClose?: boolean;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class DoctorSheet extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      acknowledgeCheckboxVisible: false,
    };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (
      !state.acknowledgeCheckboxVisible &&
      hasProblems(props.healthcheckReport.result)
    ) {
      return {
        ...state,
        acknowledgeCheckboxVisible: true,
        acknowledgeOnClose:
          state.acknowledgeOnClose === undefined
            ? !hasNewProblems(props.healthcheckReport.result)
            : state.acknowledgeOnClose,
      };
    }

    if (
      state.acknowledgeCheckboxVisible &&
      !hasProblems(props.healthcheckReport.result)
    ) {
      return {
        ...state,
        acknowledgeCheckboxVisible: false,
      };
    }

    return null;
  }

  componentWillUnmount(): void {
    if (this.state.acknowledgeOnClose) {
      this.props.acknowledgeProblems();
    } else {
      this.props.resetAcknowledgedProblems();
    }
  }

  onAcknowledgeOnCloseChanged(acknowledge: boolean): void {
    this.setState(prevState => {
      return {
        ...prevState,
        acknowledgeOnClose: acknowledge,
      };
    });
  }

  openHelpUrl(helpUrl?: string): void {
    helpUrl && shell.openExternal(helpUrl);
  }

  async runHealthchecks() {
    await runHealthchecks(this.props);
  }

  render() {
    return (
      <Container>
        <Title>Doctor</Title>
        <FlexRow>
          <HealthcheckListContainer>
            {Object.values(this.props.healthcheckReport.categories).map(
              (category: HealthcheckReportCategory) => {
                return (
                  <CategoryContainer key={category.key}>
                    <HealthcheckDisplay
                      label={category.label}
                      result={category.result}
                    />
                    {category.result.status !== 'SKIPPED' && (
                      <CategoryContainer>
                        {Object.values(category.checks).map(check => (
                          <HealthcheckDisplay
                            key={check.key}
                            label={check.label}
                            result={check.result}
                            onClick={
                              check.result.helpUrl
                                ? () => this.openHelpUrl(check.result.helpUrl)
                                : undefined
                            }
                          />
                        ))}
                      </CategoryContainer>
                    )}
                    {category.result.status === 'SKIPPED' && (
                      <CategoryContainer>
                        <SkipReasonLabel>
                          {category.result.message}
                        </SkipReasonLabel>
                      </CategoryContainer>
                    )}
                  </CategoryContainer>
                );
              },
            )}
          </HealthcheckListContainer>
          <Spacer />
          <SideContainer shrink>
            <SideMessageDisplay
              isHealthcheckInProgress={
                this.props.healthcheckReport.result.status === 'IN_PROGRESS'
              }
              hasProblems={hasProblems(this.props.healthcheckReport.result)}
            />
          </SideContainer>
        </FlexRow>
        <FlexRow>
          <Spacer />
          {this.state.acknowledgeCheckboxVisible && (
            <CenteredCheckbox
              checked={!!this.state.acknowledgeOnClose}
              onChange={this.onAcknowledgeOnCloseChanged.bind(this)}
              text={
                'Do not show warning about these problems on Flipper startup'
              }
            />
          )}
          <Button compact padded onClick={this.props.onHide}>
            Close
          </Button>
          <Button
            disabled={
              this.props.healthcheckReport.result.status === 'IN_PROGRESS'
            }
            type="primary"
            compact
            padded
            onClick={() => this.runHealthchecks()}>
            Re-run
          </Button>
        </FlexRow>
      </Container>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({healthchecks: {healthcheckReport}, settingsState}) => ({
    healthcheckReport,
    enableAndroid: settingsState.enableAndroid,
  }),
  {
    startHealthchecks,
    finishHealthchecks,
    updateHealthcheckResult,
    acknowledgeProblems,
    resetAcknowledgedProblems,
  },
)(DoctorSheet);
