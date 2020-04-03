/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {SectionComponentHierarchy} from './Models';

import {Glyph, PureComponent, styled, Toolbar, Spacer, colors} from 'flipper';
import {Tree} from 'react-d3-tree';
import {Fragment} from 'react';

const Legend = styled.div((props) => ({
  color: colors.dark50,
  marginLeft: 20,
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: props.color,
    border: `1px solid rgba(0,0,0,0.2)`,
    marginRight: 4,
    marginBottom: -1,
  },
}));

const Label = styled.div({
  position: 'relative',
  top: -7,
  left: 7,
  maxWidth: 270,
  overflow: 'hidden',
  fontWeight: '500',
  textOverflow: 'ellipsis',
  paddingLeft: 5,
  paddingRight: 5,
  background: colors.white,
  display: 'inline-block',
});

const Container = styled.div({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background:
    'linear-gradient(-90deg,rgba(0,0,0,.02) 1px,transparent 0),linear-gradient(rgba(0,0,0,.02) 1px,transparent 0),linear-gradient(-90deg,rgba(0,0,0,.03) 1px,transparent 0),linear-gradient(rgba(0,0,0,.03) 1px,transparent 0)',
  backgroundSize:
    '10px 10px,10px 10px,100px 100px,100px 100px,100px 100px,100px 100px,100px 100px,100px 100px',
});

const LabelContainer = styled.div({
  display: 'flex',
});

const IconButton = styled.div({
  position: 'relative',
  left: 5,
  top: -8,
  background: colors.white,
});

type TreeData = Array<{
  identifier: string,
  name: string,
  parent: string | '',
  didTriggerStateUpdate?: boolean,
  isReused?: boolean,
  isDirty?: boolean,
  inserted?: boolean,
  removed?: boolean,
  updated?: boolean,
  unchanged?: boolean,
  isSection?: boolean,
  isDataModel?: boolean,
}>;

type Props = {
  data: TreeData | SectionComponentHierarchy,
  nodeClickHandler?: (node: any, evt: InputEvent) => void,
};

type State = {
  translate: {
    x: number,
    y: number,
  },
  tree: ?Object,
  zoom: number,
};

class NodeLabel extends PureComponent<Props, State> {
  state = {
    collapsed: false,
  };

  showNodeData = (e) => {
    e.stopPropagation();
    this.props.onLabelClicked(this.props?.nodeData);
  };

  toggleClicked = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  };

  render() {
    const name = this.props?.nodeData?.name;
    const isSection = this.props?.nodeData?.attributes.isSection;
    const chevron = this.state.collapsed ? 'chevron-right' : 'chevron-left';

    return (
      <LabelContainer>
        <Label title={name} onClick={this.showNodeData}>
          {name}
        </Label>
        {isSection && (
          <IconButton onClick={this.toggleClicked}>
            <Glyph
              color={colors.blueGreyTint70}
              name={chevron}
              variant={'filled'}
              size={12}
            />
          </IconButton>
        )}
      </LabelContainer>
    );
  }
}

export default class extends PureComponent<Props, State> {
  treeFromFlatArray = (data: TreeData) => {
    const tree = data.map((n) => {
      let fill = colors.blueGreyTint70;
      if (n.didTriggerStateUpdate) {
        fill = colors.lemon;
      } else if (n.isReused) {
        fill = colors.teal;
      } else if (n.isDirty) {
        fill = colors.grape;
      }

      if (n.removed) {
        fill = colors.light20;
      } else if (n.inserted) {
        fill = colors.pinkDark1;
      } else if (n.updated) {
        fill = colors.orangeTint15;
      } else if (n.unchanged) {
        fill = colors.teal;
      }

      return {
        name: n.name,
        children: [],
        attributes: {...n},
        nodeSvgShape: {
          shapeProps: {
            fill,
            r: 6,
            strokeWidth: 1,
            stroke: 'rgba(0,0,0,0.2)',
          },
        },
      };
    });

    const parentMap: Map<string, Array<Object>> = tree.reduce((acc, cv) => {
      const {parent} = cv.attributes;
      if (typeof parent !== 'string') {
        return acc;
      }
      const children = acc.get(parent);
      if (children) {
        return acc.set(parent, children.concat(cv));
      } else {
        return acc.set(parent, [cv]);
      }
    }, new Map());

    tree.forEach((n) => {
      n.children = parentMap.get(n.attributes.identifier) || [];
    });

    // find the root node
    return tree.find((node) => !node.attributes.parent);
  };

  treeFromHierarchy = (data: SectionComponentHierarchy): Object => {
    return {
      name: data.type,
      children: data.children ? data.children.map(this.treeFromHierarchy) : [],
    };
  };

  state = {
    translate: {
      x: 0,
      y: 0,
    },
    tree: Array.isArray(this.props.data)
      ? this.treeFromFlatArray(this.props.data)
      : this.treeFromHierarchy(this.props.data),
    zoom: 1,
  };

  treeContainer: any = null;

  UNSAFE_componentWillReceiveProps(props: Props) {
    if (this.props.data === props.data) {
      return;
    }

    this.setState({
      tree: Array.isArray(props.data)
        ? this.treeFromFlatArray(props.data)
        : this.treeFromHierarchy(props.data),
    });
  }

  componentDidMount() {
    if (this.treeContainer) {
      const dimensions = this.treeContainer.getBoundingClientRect();
      this.setState({
        translate: {
          x: 50,
          y: dimensions.height / 2,
        },
      });
    }
  }

  onZoom = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({zoom: e.target.valueAsNumber});
  };

  render() {
    return (
      <Fragment>
        <Container
          innerRef={(ref) => {
            this.treeContainer = ref;
          }}>
          <style>
            {'.rd3t-tree-container foreignObject {overflow: visible;}'}
          </style>
          {this.state.tree && (
            <Tree
              transitionDuration={0}
              separation={{siblings: 0.5, nonSiblings: 0.5}}
              data={this.state.tree}
              translate={this.state.translate}
              zoom={this.state.zoom}
              nodeLabelComponent={{
                render: (
                  <NodeLabel onLabelClicked={this.props.nodeClickHandler} />
                ),
              }}
              allowForeignObjects
              nodeSvgShape={{
                shape: 'circle',
                shapeProps: {
                  stroke: 'rgba(0,0,0,0.2)',
                  strokeWidth: 1,
                },
              }}
              styles={{
                links: {
                  stroke: '#b3b3b3',
                },
              }}
              nodeSize={{x: 300, y: 100}}
            />
          )}
        </Container>
        <Toolbar position="bottom" compact>
          <input
            type="range"
            onChange={this.onZoom}
            value={this.state.zoom}
            min="0.1"
            max="1"
            step="0.01"
          />
          <Spacer />
          <Legend color={colors.light20}>Item removed</Legend>
          <Legend color={colors.pinkDark1}>Item inserted</Legend>
          <Legend color={colors.orangeTint15}>Item updated</Legend>
          <Legend color={colors.teal}>Item/Section Reused</Legend>
          <Legend color={colors.lemon}>Section triggered state update</Legend>
          <Legend color={colors.grape}>Section is dirty</Legend>
        </Toolbar>
      </Fragment>
    );
  }
}
