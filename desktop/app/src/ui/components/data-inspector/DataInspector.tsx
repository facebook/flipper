/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import DataDescription from './DataDescription';
import {MenuTemplate} from '../ContextMenu';
import {Component} from 'react';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import styled from '@emotion/styled';
import createPaste from '../../../fb-stubs/createPaste';
import {reportInteraction} from '../../../utils/InteractionTracker';
import DataPreview, {DataValueExtractor, InspectorName} from './DataPreview';
import {getSortedKeys} from './utils';
import {colors} from '../colors';
import {clipboard} from 'electron';
import deepEqual from 'deep-equal';
import React from 'react';
import {TooltipOptions} from '../TooltipProvider';
import {shallowEqual} from 'react-redux';
import {HighlightContext} from '../Highlight';

export {DataValueExtractor} from './DataPreview';

const BaseContainer = styled.div<{depth?: number; disabled?: boolean}>(
  (props) => ({
    fontFamily: 'Menlo, monospace',
    fontSize: 11,
    lineHeight: '17px',
    filter: props.disabled ? 'grayscale(100%)' : '',
    margin: props.depth === 0 ? '7.5px 0' : '0',
    paddingLeft: 10,
    userSelect: 'text',
  }),
);
BaseContainer.displayName = 'DataInspector:BaseContainer';

const RecursiveBaseWrapper = styled.span({
  color: colors.red,
});
RecursiveBaseWrapper.displayName = 'DataInspector:RecursiveBaseWrapper';

const Wrapper = styled.span({
  color: '#555',
});
Wrapper.displayName = 'DataInspector:Wrapper';

const PropertyContainer = styled.span({
  paddingTop: '2px',
});
PropertyContainer.displayName = 'DataInspector:PropertyContainer';

const ExpandControl = styled.span({
  color: '#6e6e6e',
  fontSize: 10,
  marginLeft: -11,
  marginRight: 5,
  whiteSpace: 'pre',
});
ExpandControl.displayName = 'DataInspector:ExpandControl';

const Added = styled.div({
  backgroundColor: colors.tealTint70,
});

const Removed = styled.div({
  backgroundColor: colors.cherryTint70,
});

const nameTooltipOptions: TooltipOptions = {
  position: 'toLeft',
  showTail: true,
};

export type DataInspectorSetValue = (path: Array<string>, val: any) => void;

export type DataInspectorDeleteValue = (path: Array<string>) => void;

export type DataInspectorExpanded = {
  [key: string]: boolean;
};

export type DiffMetadataExtractor = (
  data: any,
  diff: any,
  key: string,
) => Array<{
  data: any;
  diff?: any;
  status?: 'added' | 'removed';
}>;

type DataInspectorProps = {
  /**
   * Object to inspect.
   */
  data: any;
  /**
   * Object to compare with the provided `data` property.
   * Differences will be styled accordingly in the UI.
   */
  diff?: any;
  /**
   * Current name of this value.
   */
  name?: string;
  /**
   * Current depth.
   */
  depth: number;
  /**
   * An array containing the current location of the data relative to its root.
   */
  path: Array<string>;
  /**
   * Whether to expand the root by default.
   */
  expandRoot?: boolean;
  /**
   * An array of paths that are currently expanded.
   */
  expanded: DataInspectorExpanded;
  /**
   * An optional callback that will explode a value into its type and value.
   * Useful for inspecting serialised data.
   */
  extractValue?: DataValueExtractor;
  /**
   * Callback whenever the current expanded paths is changed.
   */
  onExpanded?: ((expanded: DataInspectorExpanded) => void) | undefined | null;
  /**
   * Callback whenever delete action is invoked on current path.
   */
  onDelete?: DataInspectorDeleteValue | undefined | null;
  /**
   * Callback when a value is edited.
   */
  setValue?: DataInspectorSetValue | undefined | null;
  /**
   * Whether all objects and arrays should be collapsed by default.
   */
  collapsed?: boolean;
  /**
   * Ancestry of parent objects, used to avoid recursive objects.
   */
  ancestry: Array<Object>;
  /**
   * Object of properties that will have tooltips
   */
  tooltips?: any;
};

const defaultValueExtractor: DataValueExtractor = (value: any) => {
  const type = typeof value;

  if (type === 'number') {
    return {mutable: true, type: 'number', value};
  }

  if (type === 'string') {
    return {mutable: true, type: 'string', value};
  }

  if (type === 'boolean') {
    return {mutable: true, type: 'boolean', value};
  }

  if (type === 'undefined') {
    return {mutable: true, type: 'undefined', value};
  }

  if (value === null) {
    return {mutable: true, type: 'null', value};
  }

  if (Array.isArray(value)) {
    return {mutable: true, type: 'array', value};
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return {mutable: true, type: 'date', value};
  }

  if (type === 'object') {
    return {mutable: true, type: 'object', value};
  }
};

const rootContextMenuCache: WeakMap<
  Object,
  Array<Electron.MenuItemConstructorOptions>
> = new WeakMap();

function getRootContextMenu(
  data: Object,
): Array<Electron.MenuItemConstructorOptions> {
  const cached = rootContextMenuCache.get(data);
  if (cached != null) {
    return cached;
  }

  const stringValue = JSON.stringify(data, null, 2);
  const menu: Array<Electron.MenuItemConstructorOptions> = [
    {
      label: 'Copy entire tree',
      click: () => clipboard.writeText(stringValue),
    },
    {
      type: 'separator',
    },
    {
      label: 'Create paste',
      click: () => {
        createPaste(stringValue);
      },
    },
  ];
  if (typeof data === 'object' && data !== null) {
    rootContextMenuCache.set(data, menu);
  } else {
    console.error(
      '[data-inspector] Ignoring unsupported data type for cache: ',
      data,
      typeof data,
    );
  }
  return menu;
}

function isPureObject(obj: Object) {
  return (
    obj !== null &&
    Object.prototype.toString.call(obj) !== '[object Date]' &&
    typeof obj === 'object'
  );
}

const diffMetadataExtractor: DiffMetadataExtractor = (
  data: any,
  key: string,
  diff?: any,
) => {
  if (diff == null) {
    return [{data: data[key]}];
  }

  const val = data[key];
  const diffVal = diff[key];
  if (!data.hasOwnProperty(key)) {
    return [{data: diffVal, status: 'removed'}];
  }
  if (!diff.hasOwnProperty(key)) {
    return [{data: val, status: 'added'}];
  }

  if (isPureObject(diffVal) && isPureObject(val)) {
    return [{data: val, diff: diffVal}];
  }

  if (diffVal !== val) {
    // Check if there's a difference between the original value and
    // the value from the diff prop
    // The property name still exists, but the values may be different.
    return [
      {data: val, status: 'added'},
      {data: diffVal, status: 'removed'},
    ];
  }

  return Object.prototype.hasOwnProperty.call(data, key) ? [{data: val}] : [];
};

function isComponentExpanded(data: any, diffType: string, diffValue: any) {
  if (diffValue == null) {
    return false;
  }

  if (diffType === 'object') {
    const sortedDataValues = Object.keys(data)
      .sort()
      .map((key) => data[key]);
    const sortedDiffValues = Object.keys(diffValue)
      .sort()
      .map((key) => diffValue[key]);
    if (JSON.stringify(sortedDataValues) !== JSON.stringify(sortedDiffValues)) {
      return true;
    }
  } else {
    if (data !== diffValue) {
      return true;
    }
  }
  return false;
}

type DataInspectorState = {
  shouldExpand: boolean;
  isExpanded: boolean;
  isExpandable: boolean;
  res: any;
  resDiff: any;
};

/**
 * An expandable data inspector.
 *
 * This component is fairly low level. It's likely you're looking for
 * [`<ManagedDataInspector>`]().
 */
export default class DataInspector extends Component<
  DataInspectorProps,
  DataInspectorState
> {
  static contextType = HighlightContext; // Replace with useHighlighter
  context!: React.ContextType<typeof HighlightContext>;

  static defaultProps: {
    expanded: DataInspectorExpanded;
    depth: number;
    path: Array<string>;
    ancestry: Array<Object>;
  } = {
    expanded: {},
    depth: 0,
    path: [],
    ancestry: [],
  };

  expandHandle: any = undefined;
  interaction: (name: string, data?: any) => void;

  constructor(props: DataInspectorProps) {
    super(props);
    this.interaction = reportInteraction('DataInspector', props.path.join(':'));
    this.state = {
      shouldExpand: false,
      isExpandable: false,
      isExpanded: false,
      res: undefined,
      resDiff: undefined,
    };
  }

  static isExpandable(data: any) {
    return (
      typeof data === 'object' && data !== null && Object.keys(data).length > 0
    );
  }

  shouldComponentUpdate(
    nextProps: DataInspectorProps,
    nextState: DataInspectorState,
  ) {
    if (!shallowEqual(nextState, this.state)) {
      return true;
    }
    const {props} = this;

    // check if any expanded paths effect this subtree
    if (nextProps.expanded !== props.expanded) {
      const path = nextProps.path.join('.');

      for (const key in nextProps.expanded) {
        if (key.startsWith(path) === false) {
          // this key doesn't effect us
          continue;
        }

        if (nextProps.expanded[key] !== props.expanded[key]) {
          return true;
        }
      }
    }

    // basic equality checks for the rest
    return (
      nextProps.data !== props.data ||
      nextProps.diff !== props.diff ||
      nextProps.name !== props.name ||
      nextProps.depth !== props.depth ||
      !deepEqual(nextProps.path, props.path) ||
      nextProps.onExpanded !== props.onExpanded ||
      nextProps.onDelete !== props.onDelete ||
      nextProps.setValue !== props.setValue ||
      nextProps.collapsed !== props.collapsed ||
      nextProps.expandRoot !== props.expandRoot
    );
  }

  static getDerivedStateFromProps(
    nextProps: DataInspectorProps,
    currentState: DataInspectorState,
  ): DataInspectorState {
    const {data, depth, diff, expandRoot, path} = nextProps;

    const res = DataInspector.extractValue(nextProps, data, depth);
    const resDiff = DataInspector.extractValue(nextProps, diff, depth);

    if (!res) {
      return {
        shouldExpand: false,
        isExpanded: false,
        isExpandable: false,
        res,
        resDiff,
      };
    }

    const isExpandable = DataInspector.isExpandable(res.value);
    let shouldExpand = false;
    if (isExpandable) {
      if (
        expandRoot === true ||
        DataInspector.shouldBeExpanded(nextProps, path)
      ) {
        shouldExpand = true;
      } else if (resDiff) {
        shouldExpand = isComponentExpanded(
          res.value,
          resDiff.type,
          resDiff.value,
        );
      }
    }

    return {
      isExpanded: currentState.isExpanded,
      shouldExpand,
      isExpandable,
      res,
      resDiff,
    };
  }

  static shouldBeExpanded(props: DataInspectorProps, pathParts: Array<string>) {
    const {expanded} = props;

    // if we have no expanded object then expand everything
    if (expanded == null) {
      return true;
    }

    const path = pathParts.join('.');

    // check if there's a setting for this path
    if (Object.prototype.hasOwnProperty.call(expanded, path)) {
      return expanded[path];
    }

    // check if all paths are collapsed
    if (props.collapsed === true) {
      return false;
    }

    // by default all items are expanded
    return true;
  }

  componentDidMount() {
    this.expandIfNeeded();
  }

  componentDidUpdate() {
    this.expandIfNeeded();
  }

  componentWillUnmount() {
    cancelIdleCallback(this.expandHandle);
  }

  expandIfNeeded() {
    if (this.state.isExpanded !== this.state.shouldExpand) {
      cancelIdleCallback(this.expandHandle);
      if (!this.state.shouldExpand) {
        this.setState({isExpanded: false});
      } else {
        this.expandHandle = requestIdleCallback(() => {
          this.setState({
            isExpanded: true,
          });
        });
      }
    }
  }

  setExpanded(pathParts: Array<string>, isExpanded: boolean) {
    const {expanded, onExpanded} = this.props;
    if (!onExpanded || !expanded) {
      return;
    }

    const path = pathParts.join('.');

    onExpanded({
      ...expanded,
      [path]: isExpanded,
    });
  }

  handleClick = () => {
    cancelIdleCallback(this.expandHandle);
    const isExpanded = DataInspector.shouldBeExpanded(
      this.props,
      this.props.path,
    );
    this.interaction(isExpanded ? 'collapsed' : 'expanded');
    this.setExpanded(this.props.path, !isExpanded);
  };

  handleDelete = (path: Array<string>) => {
    const onDelete = this.props.onDelete;
    if (!onDelete) {
      return;
    }

    onDelete(path);
  };

  static extractValue(props: DataInspectorProps, data: any, depth: number) {
    let res;

    const {extractValue} = props;
    if (extractValue) {
      res = extractValue(data, depth);
    }

    if (!res) {
      res = defaultValueExtractor(data, depth);
    }

    return res;
  }

  extractValue = (data: any, depth: number) => {
    return DataInspector.extractValue(this.props, data, depth);
  };

  render(): any {
    const {
      data,
      diff,
      depth,
      expanded: expandedPaths,
      expandRoot,
      extractValue,
      name,
      onExpanded,
      onDelete,
      path,
      ancestry,
      collapsed,
      tooltips,
    } = this.props;

    const {resDiff, isExpandable, isExpanded, res} = this.state;
    const highlighter = this.context; // useHighlighter();

    if (!res) {
      return null;
    }

    // the data inspector makes values read only when setValue isn't set so we just need to set it
    // to null and the readOnly status will be propagated to all children
    const setValue = res.mutable ? this.props.setValue : null;
    const {type, value, extra} = res;

    if (ancestry.includes(value)) {
      return <RecursiveBaseWrapper>Recursive</RecursiveBaseWrapper>;
    }

    let expandGlyph = '';
    if (isExpandable) {
      if (isExpanded) {
        expandGlyph = '▼';
      } else {
        expandGlyph = '▶';
      }
    } else {
      if (depth !== 0) {
        expandGlyph = ' ';
      }
    }

    let propertyNodesContainer = null;
    if (isExpandable && isExpanded) {
      const propertyNodes = [];

      // ancestry of children, including its owner object
      const childAncestry = ancestry.concat([value]);

      const diffValue = diff && resDiff ? resDiff.value : null;

      const keys = getSortedKeys({...value, ...diffValue});

      for (const key of keys) {
        const diffMetadataArr = diffMetadataExtractor(value, key, diffValue);
        for (const metadata of diffMetadataArr) {
          const dataInspectorNode = (
            <DataInspector
              ancestry={childAncestry}
              extractValue={extractValue}
              setValue={setValue}
              expanded={expandedPaths}
              collapsed={collapsed}
              onExpanded={onExpanded}
              onDelete={onDelete}
              path={path.concat(key)}
              depth={depth + 1}
              key={key}
              name={key}
              data={metadata.data}
              diff={metadata.diff}
              tooltips={tooltips}
            />
          );

          switch (metadata.status) {
            case 'added':
              propertyNodes.push(<Added key={key}>{dataInspectorNode}</Added>);
              break;
            case 'removed':
              propertyNodes.push(
                <Removed key={key}>{dataInspectorNode}</Removed>,
              );
              break;
            default:
              propertyNodes.push(dataInspectorNode);
          }
        }
      }

      propertyNodesContainer = propertyNodes;
    }

    if (expandRoot === true) {
      return (
        <ContextMenu component="span" items={getRootContextMenu(data)}>
          {propertyNodesContainer}
        </ContextMenu>
      );
    }

    // create name components
    const nameElems = [];
    if (typeof name !== 'undefined') {
      nameElems.push(
        <Tooltip
          title={tooltips != null && tooltips[name]}
          key="name"
          options={nameTooltipOptions}>
          <InspectorName>{highlighter.render(name)}</InspectorName>
        </Tooltip>,
      );
      nameElems.push(<span key="sep">: </span>);
    }

    // create description or preview
    let descriptionOrPreview;
    if (isExpanded || !isExpandable) {
      descriptionOrPreview = (
        <DataDescription
          path={path}
          setValue={setValue}
          type={type}
          value={value}
          extra={extra}
        />
      );
    } else {
      descriptionOrPreview = (
        <DataPreview
          type={type}
          value={value}
          extractValue={this.extractValue}
          depth={depth}
        />
      );
    }

    descriptionOrPreview = (
      <span>
        {nameElems}
        {descriptionOrPreview}
      </span>
    );

    let wrapperStart;
    let wrapperEnd;
    if (isExpanded) {
      if (type === 'object') {
        wrapperStart = <Wrapper>{'{'}</Wrapper>;
        wrapperEnd = <Wrapper>{'}'}</Wrapper>;
      }

      if (type === 'array') {
        wrapperStart = <Wrapper>{'['}</Wrapper>;
        wrapperEnd = <Wrapper>{']'}</Wrapper>;
      }
    }

    const contextMenuItems: MenuTemplate = [];

    if (isExpandable) {
      contextMenuItems.push(
        {
          label: isExpanded ? 'Collapse' : 'Expand',
          click: this.handleClick,
        },
        {
          type: 'separator',
        },
      );
    }

    contextMenuItems.push(
      {
        label: 'Copy',
        click: () =>
          clipboard.writeText((window.getSelection() || '').toString()),
      },
      {
        label: 'Copy value',
        click: () => clipboard.writeText(JSON.stringify(data, null, 2)),
      },
    );

    if (!isExpandable && onDelete) {
      contextMenuItems.push({
        label: 'Delete',
        click: () => this.handleDelete(this.props.path),
      });
    }

    return (
      <BaseContainer
        depth={depth}
        disabled={
          Boolean(this.props.setValue) === true && Boolean(setValue) === false
        }>
        <ContextMenu component="span" items={contextMenuItems}>
          <PropertyContainer
            onClick={isExpandable ? this.handleClick : undefined}>
            {expandedPaths && <ExpandControl>{expandGlyph}</ExpandControl>}
            {descriptionOrPreview}
            {wrapperStart}
          </PropertyContainer>
        </ContextMenu>
        {propertyNodesContainer}
        {wrapperEnd}
      </BaseContainer>
    );
  }
}
