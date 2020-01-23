/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {styled, colors} from 'flipper';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
  setActiveSheet,
  ActiveSheet,
  ACTIVE_SHEET_DOCTOR,
  ACTIVE_SHEET_SETTINGS,
} from '../reducers/application';
import {State as Store} from '../reducers/index';
import {ButtonGroup, Button} from 'flipper';
import {FlexColumn, FlexRow} from 'flipper';
import runHealthchecks, {
  HealthcheckSettings,
  HealthcheckEventsHandler,
} from '../utils/runHealthchecks';
import {
  updateHealthcheckResult,
  startHealthchecks,
  finishHealthchecks,
  HealthcheckReport,
  HealthcheckResult,
} from '../reducers/healthchecks';

import {reportUsage} from '../utils/metrics';

type StateFromProps = {
  healthcheckReport: HealthcheckReport;
} & HealthcheckSettings;

type DispatchFromProps = {
  setActiveSheet: (payload: ActiveSheet) => void;
} & HealthcheckEventsHandler;

type State = {visible: boolean; message: string; showSettingsButton: boolean};

type Props = DispatchFromProps & StateFromProps;
class DoctorBar extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      visible: false,
      message: '',
      showSettingsButton: false,
    };
  }
  componentDidMount() {
    this.showMessageIfChecksFailed();
  }
  static getDerivedStateFromProps(props: Props, state: State): State | null {
    const failedCategories = Object.values(
      props.healthcheckReport.categories,
    ).filter(cat => hasProblems(cat.result));
    if (failedCategories.length == 1) {
      const failedCat = failedCategories[0];
      if (failedCat.key === 'ios' || failedCat.key === 'android') {
        return {
          ...state,
          message: `Doctor has discovered problems with your ${failedCat.label} setup. If you are not interested in ${failedCat.label} development you can disable it in Settings.`,
          showSettingsButton: true,
        };
      }
    }
    if (failedCategories.length) {
      return {
        ...state,
        message: 'Doctor has discovered problems with your installation.',
        showSettingsButton: false,
      };
    }
    return null;
  }
  async showMessageIfChecksFailed() {
    await runHealthchecks(this.props);
    const result = this.props.healthcheckReport.result;
    if (hasProblems(result)) {
      if (result.isAcknowledged) {
        reportUsage('doctor:warning:suppressed');
      } else {
        this.setVisible(true);
        reportUsage('doctor:warning:shown');
      }
    }
  }
  render() {
    return (
      this.state.visible && (
        <Container>
          <WarningContainer>
            <FlexRow style={{flexDirection: 'row-reverse'}}>
              <ButtonSection>
                <ButtonGroup>
                  <Button
                    onClick={() => {
                      reportUsage('doctor:report:opened:fromWarningBar');
                      this.props.setActiveSheet(ACTIVE_SHEET_DOCTOR);
                      this.setVisible(false);
                    }}>
                    Show Problems
                  </Button>
                  {this.state.showSettingsButton && (
                    <Button
                      onClick={() => {
                        reportUsage('settings:opened:fromWarningBar');
                        this.props.setActiveSheet(ACTIVE_SHEET_SETTINGS);
                      }}>
                      Show Settings
                    </Button>
                  )}
                  <Button onClick={() => this.setVisible(false)}>
                    Dismiss
                  </Button>
                </ButtonGroup>
              </ButtonSection>
              <FlexColumn style={{flexGrow: 1}}>
                {this.state.message}
              </FlexColumn>
            </FlexRow>
          </WarningContainer>
        </Container>
      )
    );
  }
  setVisible(visible: boolean) {
    this.setState(prevState => {
      return {
        ...prevState,
        visible,
      };
    });
  }
}

export default connect<StateFromProps, DispatchFromProps, {}, Store>(
  ({
    settingsState: {enableAndroid, enableIOS},
    healthchecks: {healthcheckReport},
  }) => ({
    enableAndroid,
    enableIOS,
    healthcheckReport,
  }),
  {
    setActiveSheet,
    updateHealthcheckResult,
    startHealthchecks,
    finishHealthchecks,
  },
)(DoctorBar);

const Container = styled.div({
  boxShadow: '2px 2px 2px #ccc',
  userSelect: 'text',
});

const WarningContainer = styled.div({
  backgroundColor: colors.orange,
  color: '#fff',
  maxHeight: '600px',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'max-height 0.3s ease',
  '&.collapsed': {
    maxHeight: '0px',
  },
  padding: '4px 12px',
  borderBottom: '1px solid ' + colors.orangeDark3,
  verticalAlign: 'middle',
  lineHeight: '28px',
});

const ButtonSection = styled(FlexColumn)({
  marginLeft: '8px',
  flexShrink: 0,
  flexGrow: 0,
});

function hasProblems(result: HealthcheckResult) {
  return result.status === 'WARNING' || result.status === 'FAILED';
}
