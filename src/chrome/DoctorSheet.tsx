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
} from 'flipper';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {
  HealthcheckResult,
  HealthcheckReportCategory,
  HealthcheckReportItem,
  HealthcheckReport,
  initHealthcheckReport,
  updateHealthcheckReportItem,
  startHealthchecks,
  finishHealthchecks,
} from '../reducers/healthchecks';
import runHealthchecks from '../utils/runHealthchecks';
import {shell} from 'electron';

type StateFromProps = {
  report: HealthcheckReport;
};

type DispatchFromProps = {
  initHealthcheckReport: (report: HealthcheckReport) => void;
  updateHealthcheckReportItem: (
    categoryIdx: number,
    itemIdx: number,
    item: HealthcheckReportItem,
  ) => void;
  startHealthchecks: () => void;
  finishHealthchecks: () => void;
};

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
  width: 320,
});

const SideContainerText = styled(Text)({
  display: 'block',
  'word-wrap': 'break-word',
});

const HealthcheckLabel = styled(Text)({
  paddingLeft: 5,
});

type OwnProps = {
  onHide: () => void;
};

function HealthcheckIcon(props: {check: HealthcheckResult}) {
  switch (props.check.status) {
    case 'IN_PROGRESS':
      return <LoadingIndicator size={16} title={props.check.message} />;
    case 'SUCCESS':
      return (
        <Glyph
          size={16}
          name={'checkmark'}
          color={colors.green}
          title={props.check.message}
        />
      );
    case 'WARNING':
      return (
        <Glyph
          size={16}
          name={'caution'}
          color={colors.yellow}
          title={props.check.message}
        />
      );
    default:
      return (
        <Glyph
          size={16}
          name={'cross'}
          color={colors.red}
          title={props.check.message}
        />
      );
  }
}

function HealthcheckDisplay(props: {
  category: HealthcheckReportCategory;
  check: HealthcheckReportItem;
  onClick?: () => void;
}) {
  return (
    <FlexColumn shrink>
      <HealthcheckDisplayContainer shrink title={props.check.message}>
        <HealthcheckIcon check={props.check} />
        <HealthcheckLabel
          underline={!!props.onClick}
          cursor={props.onClick && 'pointer'}
          onClick={props.onClick}>
          {props.check.label}
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

export type State = {};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class DoctorSheet extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  openHelpUrl(check: HealthcheckReportItem): void {
    check.helpUrl && shell.openExternal(check.helpUrl);
  }

  async runHealthchecks() {
    this.setState(prevState => {
      return {
        ...prevState,
      };
    });
    await runHealthchecks({
      initHealthcheckReport: this.props.initHealthcheckReport,
      updateHealthcheckReportItem: this.props.updateHealthcheckReportItem,
      startHealthchecks: this.props.startHealthchecks,
      finishHealthchecks: this.props.finishHealthchecks,
    });
  }

  hasProblems() {
    return this.props.report.categories.some(cat =>
      cat.checks.some(chk => chk.status != 'SUCCESS'),
    );
  }

  getHealthcheckCategoryReportItem(
    state: HealthcheckReportCategory,
  ): HealthcheckReportItem {
    return {
      label: state.label,
      ...(state.checks.some(c => c.status === 'IN_PROGRESS')
        ? {status: 'IN_PROGRESS'}
        : state.checks.every(c => c.status === 'SUCCESS')
        ? {status: 'SUCCESS'}
        : state.checks.some(c => c.status === 'FAILED')
        ? {
            status: 'FAILED',
            message: 'Doctor discovered problems with the current installation',
          }
        : {
            status: 'WARNING',
            message:
              'Doctor discovered non-blocking problems with the current installation',
          }),
    };
  }

  render() {
    return (
      <Container>
        <Title>Doctor</Title>
        <FlexRow>
          <HealthcheckListContainer>
            {Object.values(this.props.report.categories).map(
              (category, categoryIdx) => {
                return (
                  <CategoryContainer key={categoryIdx}>
                    <HealthcheckDisplay
                      check={this.getHealthcheckCategoryReportItem(category)}
                      category={category}
                    />
                    <CategoryContainer>
                      {category.checks.map((check, checkIdx) => (
                        <HealthcheckDisplay
                          key={checkIdx}
                          category={category}
                          check={check}
                          onClick={
                            check.helpUrl
                              ? () => this.openHelpUrl(check)
                              : undefined
                          }
                        />
                      ))}
                    </CategoryContainer>
                  </CategoryContainer>
                );
              },
            )}
          </HealthcheckListContainer>
          <Spacer />
          <SideContainer shrink>
            <SideMessageDisplay
              isHealthcheckInProgress={
                this.props.report.isHealthcheckInProgress
              }
              hasProblems={this.hasProblems()}
            />
          </SideContainer>
        </FlexRow>
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={this.props.onHide}>
            Close
          </Button>
          <Button
            disabled={this.props.report.isHealthcheckInProgress}
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
  ({healthchecks: {healthcheckReport}}) => ({
    report: healthcheckReport,
  }),
  {
    initHealthcheckReport,
    updateHealthcheckReportItem,
    startHealthchecks,
    finishHealthchecks,
  },
)(DoctorSheet);
