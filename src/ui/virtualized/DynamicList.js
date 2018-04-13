/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {RowRenderer, OnScroll, KeyMapper} from './types.js';
import {PureComponent, Component} from 'react';
import {ResizeSensor} from '../index.js';
import {findDOMNode} from 'react-dom';

type RowMeasureProps = {
  id: string,
  onMount: (key: string, ref: ?Text | Element) => void,
  children: React$Node,
};

class RowMeasure extends PureComponent<RowMeasureProps> {
  componentDidMount() {
    this.props.onMount(this.props.id, findDOMNode(this));
  }

  render() {
    return this.props.children;
  }
}

const CONTAINER_STYLE = {
  position: 'relative',
  overflow: 'auto',
  width: '100%',
  height: '100%',
};

type DynamicListProps = {
  pureData: any,
  onMount?: () => void,
  getPrecalculatedDimensions: (
    index: number,
  ) => ?{
    width: number | string,
    height: number,
  },
  rowCount: number,
  rowRenderer: RowRenderer,
  keyMapper: KeyMapper,
  onScroll?: OnScroll,
  sideScrollable?: boolean,
};

type DynamicListState = {
  mounted: boolean,
  startIndex: number,
  endIndex: number,
  containerStyle: Object,
  innerStyle: Object,
  scrollHeight: number,
  scrollTop: number,
  height: number,
  width: number,
};

export default class DynamicList extends Component<
  DynamicListProps,
  DynamicListState,
> {
  constructor(props: DynamicListProps, context: Object) {
    super(props, context);

    this.topPositionToIndex = new Map();
    this.positions = new Map();
    this.dimensions = new Map();
    this.measureQueue = new Map();

    this.state = {
      mounted: false,
      startIndex: -1,
      endIndex: -1,
      containerStyle: {},
      innerStyle: {},
      scrollHeight: 0,
      scrollTop: 0,
      height: 0,
      width: 0,
    };
  }

  containerRef: ?HTMLDivElement;

  measureQueue: Map<string, React$Node>;

  topPositionToIndex: Map<number, number>;
  positions: Map<
    number,
    {
      top: number,
      style: Object,
    },
  >;

  dimensions: Map<
    string,
    {
      width: number | string,
      height: number,
    },
  >;

  scrollToIndex = (index: number, additionalOffset: number = 0) => {
    const pos = this.positions.get(index);
    const ref = this.getContainerRef();
    if (pos != null && ref != null) {
      ref.scrollTop = pos.top - additionalOffset;
    }
  };

  setContainerRef = (ref: ?HTMLDivElement) => {
    this.containerRef = ref;
  };

  getContainerRef(): ?HTMLDivElement {
    return this.containerRef;
  }

  componentWillReceiveProps(nextProps: DynamicListProps) {
    if (
      nextProps.rowCount !== this.props.rowCount ||
      nextProps.pureData !== this.props.pureData
    ) {
      this.queueMeasurements(nextProps);
    }
  }

  componentDidMount() {
    // perform initial measurements and container dimension calculation
    this.recalculateContainerDimensions();
    this.queueMeasurements(this.props);

    // if onMount we didn't add any measurements then we've successfully calculated all row sizes
    if (this.measureQueue.size === 0) {
      this.onMount();
    }
  }

  onMount() {
    this.setState(state => {
      if (state.mounted === false && this.props.onMount != null) {
        this.props.onMount();
      }
      return {mounted: true};
    });
  }

  // called when the window is resized, we recalculate the positions and visibility of rows
  onResize = (e: UIEvent) => {
    this.dimensions.clear();
    this.queueMeasurements(this.props);
    this.recalculateContainerDimensions();
    this.recalculateVisibleRows(this.props);
  };

  queueMeasurements(props: DynamicListProps) {
    // create measurements for new rows
    for (let i = 0; i < props.rowCount; i++) {
      const key = props.keyMapper(i);
      if (this.dimensions.has(key)) {
        continue;
      }

      const precalculated = props.getPrecalculatedDimensions(i);
      if (precalculated) {
        this.dimensions.set(key, precalculated);
        continue;
      }

      this.measureQueue.set(
        key,
        props.rowRenderer({
          index: i,
          style: {
            visibility: 'hidden',
          },
        }),
      );
    }

    // recalculate the visibility and positions of all rows
    this.recalculatePositions(props);
    this.recalculateVisibleRows(props);
  }

  recalculateContainerDimensions = () => {
    const container = this.getContainerRef();
    if (container != null) {
      this.setState({
        scrollTop: container.scrollTop,
        height: container.clientHeight,
        width: container.clientWidth,
      });
    }
  };

  recalculateVisibleRows = (props: DynamicListProps) => {
    this.setState(state => {
      let startTop = 0;

      // find the start index
      let startIndex = 0;
      let scrollTop = state.scrollTop;
      do {
        const index = this.topPositionToIndex.get(scrollTop);
        if (index != null) {
          const startPos = this.positions.get(index);
          if (startPos != null) {
            startTop = startPos.top;
            startIndex = index;
            break;
          }
        }

        scrollTop--;
      } while (scrollTop > 0);

      // find the end index
      let endIndex = startIndex;
      let scrollBottom = state.scrollTop + state.height;
      while (true) {
        // if the scrollBottom is equal to the height of the scrollable area then
        // we were unable to find the end index because we're at the bottom of the
        // list
        if (scrollBottom >= state.scrollHeight) {
          endIndex = props.rowCount - 1;
          break;
        }

        const index = this.topPositionToIndex.get(scrollBottom);
        if (index != null) {
          endIndex = index;
          break;
        }

        scrollBottom++;
      }

      if (
        startIndex === state.startIndex &&
        endIndex === state.endIndex &&
        startTop === state.containerStyle.top
      ) {
        // this is to ensure that we don't create a new containerStyle object and obey reference equality for purity checks
        return {};
      }

      const sideScrollable = props.sideScrollable || false;

      return {
        startIndex,
        endIndex,
        containerStyle: sideScrollable
          ? {
              position: 'absolute',
              top: startTop,
              left: 0,
              minWidth: '100%',
            }
          : {
              position: 'absolute',
              top: startTop,
              right: 0,
              left: 0,
            },
      };
    });
  };

  onRowMeasured = (key: string, elem: ?Text | Element) => {
    if (elem != null && elem instanceof HTMLElement) {
      const dim = {
        height: elem.clientHeight,
        width: elem.clientWidth,
      };
      this.dimensions.set(key, dim);
    }

    this.measureQueue.delete(key);

    if (this.measureQueue.size === 0) {
      this.recalculatePositions(this.props);

      if (this.state.mounted === false) {
        // we triggered measurements on componentDidMount and they're now complete!
        this.onMount();
      }
    }
  };

  handleScroll = () => {
    // recalcualte visible rows
    const ref = this.getContainerRef();
    if (ref != null) {
      this.setState({
        scrollTop: ref.scrollTop,
      });
      this.recalculateVisibleRows(this.props);

      this.props.onScroll &&
        this.props.onScroll({
          clientHeight: ref.clientHeight,
          scrollHeight: ref.scrollHeight,
          scrollTop: ref.scrollTop,
        });
    }
  };

  recalculatePositions(props: DynamicListProps) {
    this.positions.clear();
    this.topPositionToIndex.clear();

    let top = 0;

    for (let i = 0; i < props.rowCount; i++) {
      const key = props.keyMapper(i);
      const dim = this.dimensions.get(key);
      if (dim == null) {
        continue;
      }

      this.positions.set(i, {
        top,
        style: {
          width: dim.width,
          height: dim.height,
        },
      });

      this.topPositionToIndex.set(top, i);

      top += dim.height;
    }

    this.setState({
      scrollHeight: top,
      innerStyle: {
        height: top,
        overflow: 'visibile',
        position: 'relative',
      },
    });
  }

  render() {
    // add elements to be measured
    const measureChildren = [];
    for (const [key, value] of this.measureQueue) {
      measureChildren.push(
        <RowMeasure key={key} id={key} onMount={this.onRowMeasured}>
          {value}
        </RowMeasure>,
      );
    }

    // add visible rows
    const children = [];
    for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
      const pos = this.positions.get(i);
      if (pos == null) {
        continue;
      }

      children.push(
        this.props.rowRenderer({
          index: i,
          style: pos.style,
        }),
      );
    }

    return (
      <div
        ref={this.setContainerRef}
        onScroll={this.handleScroll}
        style={CONTAINER_STYLE}>
        <ResizeSensor onResize={this.onResize} />
        <div style={this.state.innerStyle}>
          <div style={this.state.containerStyle}>{children}</div>
        </div>
        {measureChildren}
      </div>
    );
  }
}
