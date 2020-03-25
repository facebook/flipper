/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {TreeGeneration} from './Models.js';

import {
  FlexColumn,
  FlexRow,
  Component,
  Tooltip,
  Glyph,
  styled,
  colors,
} from 'flipper';
import React from 'react';

const PADDING = 15;
const WIDTH = 70;
const LABEL_WIDTH = 140;

const Container = styled(FlexRow)({
  flexShrink: 0,
  flexGrow: 1,
});

const SurfaceContainer = styled(FlexColumn)((props) => ({
  position: 'relative',
  '::after': {
    display: props.scrolled ? 'block' : 'none',
    content: '""',
    top: 0,
    bottom: 0,
    right: -15,
    width: 15,
    background: `linear-gradient(90deg, ${colors.macOSTitleBarBackgroundBlur} 0%, transparent 100%)`,
    zIndex: 3,
    position: 'absolute',
  },
}));

const TimeContainer = styled(FlexColumn)({
  overflow: 'scroll',
  flexGrow: 1,
  flexShrink: 1,
});

const Row = styled(FlexRow)((props) => ({
  alignItems: 'center',
  paddingBottom: 3,
  marginTop: 3,
  flexGrow: 1,
  flexShrink: 0,
  maxHeight: 75,
  position: 'relative',
  minWidth: '100%',
  alignSelf: 'flex-start',
  '::before': {
    display: props.showTimeline ? 'block' : 'none',
    zIndex: 1,
    content: '""',
    position: 'absolute',
    borderTop: `1px dotted ${colors.light15}`,
    height: 1,
    top: '50%',
    left: 0,
    right: 0,
  },
}));

const Label = styled.div({
  width: LABEL_WIDTH,
  paddingLeft: 10,
  paddingRight: 10,
  fontWeight: 'bold',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textAlign: 'right',
  flexShrink: 0,
  position: 'sticky',
  left: 0,
  zIndex: 2,
});

const Content = styled.div({
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  fontSize: 11,
  textAlign: 'center',
  textTransform: 'uppercase',
  fontWeight: '500',
  color: colors.light50,
});

const Record = styled.div(({highlighted}) => ({
  border: `1px solid ${colors.light15}`,
  boxShadow: highlighted
    ? `inset 0 0 0 2px ${colors.macOSTitleBarIconSelected}`
    : 'none',
  borderRadius: 5,
  padding: 5,
  marginRight: PADDING,
  backgroundColor: colors.white,
  zIndex: 2,
  position: 'relative',
  width: WIDTH,
  flexShrink: 0,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
}));

const Empty = styled.div({
  width: WIDTH,
  padding: '10px 5px',
  marginRight: PADDING,
  flexShrink: 0,
  position: 'relative',
});

const Icon = styled(Glyph)({
  position: 'absolute',
  right: 5,
  top: 5,
});

type Props = {|
  generations: Array<TreeGeneration>,
  focusedGenerationId: ?string,
  onClick: (id: string) => mixed,
|};

type State = {
  scrolled: boolean,
};

export default class extends Component<Props, State> {
  state = {
    scrolled: false,
  };

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Props) {
    const {focusedGenerationId} = this.props;
    if (
      focusedGenerationId &&
      focusedGenerationId !== prevProps.focusedGenerationId
    ) {
      const node = document.querySelector(`[data-id="${focusedGenerationId}"]`);
      if (node) {
        node.scrollIntoViewIfNeeded();
      }
    }
  }

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') {
      return;
    }
    e.preventDefault();
    let nextGenerationId = null;

    const index = this.props.generations.findIndex(
      (g) => g.id === this.props.focusedGenerationId,
    );

    const direction = e.key === 'ArrowRight' ? 1 : -1;
    const bound = e.key === 'ArrowRight' ? this.props.generations.length : -1;

    for (let i = index + direction; i !== bound; i += direction) {
      if (
        this.props.generations[i].surface_key ===
        this.props.generations[index].surface_key
      ) {
        nextGenerationId = this.props.generations[i].id;
        break;
      }
    }

    if (nextGenerationId) {
      this.props.onClick(nextGenerationId);
    }
  };

  onScroll = (e: SyntheticUIEvent<HTMLElement>) =>
    this.setState({scrolled: e.currentTarget.scrollLeft > 0});

  render() {
    const surfaces = this.props.generations.reduce(
      (acc, cv) => acc.add(cv.surface_key),
      new Set(),
    );
    return (
      <Container>
        <SurfaceContainer scrolled={this.state.scrolled}>
          {[...surfaces].map((surface) => (
            <Row key={surface}>
              <Label title={surface}>{surface}</Label>
            </Row>
          ))}
        </SurfaceContainer>
        <TimeContainer onScroll={this.onScroll}>
          {[...surfaces].map((surface) => (
            <Row key={surface} showTimeline>
              {this.props.generations.map((record: TreeGeneration) =>
                record.surface_key === surface ? (
                  <Record
                    key={`${surface}${record.id}`}
                    data-id={record.id}
                    highlighted={record.id === this.props.focusedGenerationId}
                    onClick={() => this.props.onClick(record.id)}>
                    <Content>{record.reason}</Content>
                    {record.reentrant_count > 0 && (
                      <Tooltip
                        title={'Reentrant count ' + record.reentrant_count}>
                        <Icon
                          color={colors.red}
                          name="caution-circle"
                          variant="filled"
                          size={12}
                        />
                      </Tooltip>
                    )}
                  </Record>
                ) : (
                  <Empty key={`${surface}${record.id}`} />
                ),
              )}
            </Row>
          ))}
        </TimeContainer>
      </Container>
    );
  }
}
