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
} from '../reducers/application';
import {State as Store} from '../reducers/index';
import {ButtonGroup, Button} from 'flipper';
import {FlexColumn, FlexRow} from 'flipper';
import runHealthchecks from '../utils/runHealthchecks';
import {
  initHealthcheckReport,
  updateHealthcheckReportItem,
  startHealthchecks,
  finishHealthchecks,
  HealthcheckReport,
  HealthcheckReportItem,
} from '../reducers/healthchecks';

type StateFromProps = {};

type DispatchFromProps = {
  setActiveSheet: (payload: ActiveSheet) => void;
  initHealthcheckReport: (report: HealthcheckReport) => void;
  updateHealthcheckReportItem: (
    categoryIdx: number,
    itemIdx: number,
    item: HealthcheckReportItem,
  ) => void;
  startHealthchecks: () => void;
  finishHealthchecks: () => void;
};

type State = {
  visible: boolean;
};

type Props = DispatchFromProps & StateFromProps;
class DoctorBar extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      visible: false,
    };
  }
  componentDidMount() {
    this.showMessageIfChecksFailed();
  }
  async showMessageIfChecksFailed() {
    const result = await runHealthchecks({
      initHealthcheckReport: this.props.initHealthcheckReport,
      updateHealthcheckReportItem: this.props.updateHealthcheckReportItem,
      startHealthchecks: this.props.startHealthchecks,
      finishHealthchecks: this.props.finishHealthchecks,
    });
    if (!result) {
      this.setVisible(true);
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
                    onClick={() =>
                      this.props.setActiveSheet(ACTIVE_SHEET_DOCTOR)
                    }>
                    Show Problems
                  </Button>
                  <Button onClick={() => this.setVisible(false)}>
                    Dismiss
                  </Button>
                </ButtonGroup>
              </ButtonSection>
              <FlexColumn style={{flexGrow: 1}}>
                Doctor has discovered problems with your installation
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

export default connect<StateFromProps, DispatchFromProps, {}, Store>(null, {
  setActiveSheet,
  initHealthcheckReport,
  updateHealthcheckReportItem,
  startHealthchecks,
  finishHealthchecks,
})(DoctorBar);

const Container = styled('div')({
  boxShadow: '2px 2px 2px #ccc',
  userSelect: 'text',
});

const WarningContainer = styled('div')({
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
