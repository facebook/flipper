/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import DataDescription from './DataDescription.js';
import {Component} from 'react';
import ContextMenu from '../ContextMenu.js';
import styled from '../../styled/index.js';
import DataPreview from './DataPreview.js';
import createPaste from '../../../utils/createPaste.js';
import {reportInteraction} from '../../../utils/InteractionTracker.js';
import {getSortedKeys} from './utils.js';
import {colors} from '../colors.js';
import {clipboard} from 'electron';

const deepEqual = require('deep-equal');

const BaseContainer = styled.view(
  {
    fontFamily: 'Menlo, monospace',
    fontSize: 11,
    lineHeight: '17px',
    filter: props => (props.disabled ? 'grayscale(100%)' : ''),
    margin: props => (props.depth === 0 ? '7.5px 0' : '0'),
    paddingLeft: 10,
    userSelect: 'text',
  },
  {
    ignoreAttributes: ['depth', 'disabled'],
  },
);

const RecursiveBaseWrapper = styled.text({
  color: colors.red,
});

const Wrapper = styled.text({
  color: '#555',
});

const PropertyContainer = styled.text({
  paddingTop: '2px',
});

const ExpandControl = styled.text({
  color: '#6e6e6e',
  fontSize: 10,
  marginLeft: -11,
  marginRight: 5,
  whiteSpace: 'pre',
});

export const InspectorName = styled.text({
  color: colors.grapeDark1,
});

export type DataValueExtractor = (
  value: any,
  depth: number,
) => ?{|
  mutable: boolean,
  type: string,
  value: any,
|};

export type DataInspectorSetValue = (path: Array<string>, val: any) => void;

export type DataInspectorExpanded = {
  [key: string]: boolean,
};

export type DiffMetadataExtractor = (
  data: any,
  diff: any,
  key: string,
) => Array<{|
  data: any,
  diff?: any,
  status?: 'added' | 'removed',
|}>;

type DataInspectorProps = {
  /**
   * Object to inspect.
   */
  data: any,
  /**
   * Object to compare with the provided `data` property.
   * Differences will be styled accordingly in the UI.
   */
  diff?: any,
  /**
   * Current name of this value.
   */
  name?: string,
  /**
   * Current depth.
   */
  depth: number,
  /**
   * An array containing the current location of the data relative to it's root.
   */
  path: Array<string>,
  /**
   * Whether to expand the root by default.
   */
  expandRoot?: boolean,
  /**
   * An array of paths that are currently expanded.
   */
  expanded: DataInspectorExpanded,
  /**
   * An optional callback that will explode a value into it's type and value.
   * Useful for inspecting serialised data.
   */
  extractValue?: DataValueExtractor,
  /**
   * Callback whenever the current expanded paths is changed.
   */
  onExpanded?: ?(expanded: DataInspectorExpanded) => void,
  /**
   * Callback when a value is edited.
   */
  setValue?: ?DataInspectorSetValue,
  /**
   * Whether all objects and arrays should be collapsed by default.
   */
  collapsed?: boolean,
  /**
   * Ancestry of parent objects, used to avoid recursive objects.
   */
  ancestry: Array<Object>,
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
  Array<Electron$MenuItemOptions>,
> = new WeakMap();

function getRootContextMenu(data: Object): Array<Electron$MenuItemOptions> {
  const cached = rootContextMenuCache.get(data);
  if (cached != null) {
    return cached;
  }

  const stringValue = JSON.stringify(data, null, 2);
  const menu: Array<Electron$MenuItemOptions> = [
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
  rootContextMenuCache.set(data, menu);
  return menu;
}

function isPureObject(obj: Object) {
  return (
    Object.prototype.toString.call(obj) !== '[object Date]' &&
    typeof obj === 'object'
  );
}

const diffMetadataExtractor: DiffMetadataExtractor = (
  data: any,
  diff?: any,
  key: string,
) => {
  if (diff == null) {
    return [{data: data[key]}];
  }

  const val = data[key];
  const diffVal = diff[key];
  if (!data.hasOwnProperty(key)) {
    return [{data: diffVal, status: 'added'}];
  }
  if (!diff.hasOwnProperty(key)) {
    return [{data: val, status: 'removed'}];
  }

  if (isPureObject(diffVal) && isPureObject(val)) {
    return [{data: val, diff: diffVal}];
  }

  if (diffVal !== val) {
    // Check if there's a difference between the original value and
    // the value from the diff prop
    // The property name still exists, but the values may be different.
    return [{data: diffVal, status: 'added'}, {data: val, status: 'removed'}];
  }

  return Object.prototype.hasOwnProperty.call(data, key) ? [{data: val}] : [];
};

function isComponentExpanded(
  data: any,
  diffType: string,
  diffValue: any,
  isExpanded: boolean,
) {
  if (isExpanded) {
    return true;
  }

  if (diffValue == null) {
    return false;
  }

  if (diffType === 'object') {
    const sortedDataValues = Object.keys(data)
      .sort()
      .map(key => data[key]);
    const sortedDiffValues = Object.keys(diffValue)
      .sort()
      .map(key => diffValue[key]);
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

/**
 * An expandable data inspector.
 *
 * This component is fairly low level. It's likely you're looking for
 * [`<ManagedDataInspector>`]().
 */
export default class DataInspector extends Component<DataInspectorProps> {
  static defaultProps: {|
    expanded: DataInspectorExpanded,
    depth: number,
    path: Array<string>,
    ancestry: Array<Object>,
  |} = {
    expanded: {},
    depth: 0,
    path: [],
    ancestry: [],
  };

  interaction: (name: string) => void;

  constructor(props: DataInspectorProps) {
    super();
    this.interaction = reportInteraction('DataInspector', props.path.join(':'));
  }

  static isExpandable(data: any) {
    return (
      typeof data === 'object' && data !== null && Object.keys(data).length > 0
    );
  }

  shouldComponentUpdate(nextProps: DataInspectorProps) {
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
      nextProps.setValue !== props.setValue
    );
  }

  isExpanded(pathParts: Array<string>) {
    const {expanded} = this.props;

    // if we no expanded object then expand everything
    if (expanded == null) {
      return true;
    }

    const path = pathParts.join('.');

    // check if there's a setting for this path
    if (Object.prototype.hasOwnProperty.call(expanded, path)) {
      return expanded[path];
    }

    // check if all paths are collapsed
    if (this.props.collapsed === true) {
      return false;
    }

    // by default all items are expanded
    return true;
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
    const isExpanded = this.isExpanded(this.props.path);
    this.interaction(isExpanded ? 'collapsed' : 'expanded');
    this.setExpanded(this.props.path, !isExpanded);
  };

  extractValue = (data: any, depth: number) => {
    let res;

    const {extractValue} = this.props;
    if (extractValue) {
      res = extractValue(data, depth);
    }

    if (!res) {
      res = defaultValueExtractor(data, depth);
    }

    return res;
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
      path,
      ancestry,
      collapsed,
    } = this.props;

    // the data inspector makes values read only when setValue isn't set so we just need to set it
    // to null and the readOnly status will be propagated to all children
    let {setValue} = this.props;

    const res = this.extractValue(data, depth);
    const resDiff = this.extractValue(diff, depth);

    let type;
    let value;
    if (res) {
      if (!res.mutable) {
        setValue = null;
      }

      ({type, value} = res);
    } else {
      return null;
    }

    if (ancestry.includes(value)) {
      return <RecursiveBaseWrapper>Recursive</RecursiveBaseWrapper>;
    }

    const isExpandable = DataInspector.isExpandable(value);
    const isExpanded =
      isExpandable &&
      (resDiff != null
        ? isComponentExpanded(
            value,
            resDiff.type,
            resDiff.value,
            expandRoot === true || this.isExpanded(path),
          )
        : expandRoot === true || this.isExpanded(path));

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

    let propertyNodesContainer;
    if (isExpandable && isExpanded) {
      const propertyNodes = [];

      // ancestry of children, including it's owner object
      const childAncestry = ancestry.concat([value]);

      const diffValue = diff && resDiff ? resDiff.value : null;

      const keys = getSortedKeys({...value, ...diffValue});

      const Added = styled.view({
        backgroundColor: colors.tealTint70,
      });
      const Removed = styled.view({
        backgroundColor: colors.cherryTint70,
      });

      for (const key of keys) {
        const diffMetadataArr = diffMetadataExtractor(value, diffValue, key);
        for (const metadata of diffMetadataArr) {
          const dataInspectorNode = (
            <DataInspector
              ancestry={childAncestry}
              extractValue={extractValue}
              setValue={setValue}
              expanded={expandedPaths}
              collapsed={collapsed}
              onExpanded={onExpanded}
              path={path.concat(key)}
              depth={depth + 1}
              key={key}
              name={key}
              data={metadata.data}
              diff={metadata.diff}
            />
          );

          switch (metadata.status) {
            case 'added':
              propertyNodes.push(<Added>{dataInspectorNode}</Added>);
              break;
            case 'removed':
              propertyNodes.push(<Removed>{dataInspectorNode}</Removed>);
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
      nameElems.push(<InspectorName key="name">{name}</InspectorName>);
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
        />
      );
    } else {
      descriptionOrPreview = (
        <DataPreview
          type={type}
          value={value}
          setValue={setValue}
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

    const contextMenuItems = [];

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
        click: () => clipboard.writeText(window.getSelection().toString()),
      },
      {
        label: 'Copy value',
        click: () => clipboard.writeText(JSON.stringify(data, null, 2)),
      },
    );

    return (
      <BaseContainer
        depth={depth}
        disabled={
          Boolean(this.props.setValue) === true && Boolean(setValue) === false
        }>
        <ContextMenu component="span" items={contextMenuItems}>
          <PropertyContainer onClick={isExpandable ? this.handleClick : null}>
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
