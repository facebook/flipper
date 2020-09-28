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
import {memo, useMemo, useRef, useState, useEffect, useCallback} from 'react';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import styled from '@emotion/styled';
import createPaste from '../../../fb-stubs/createPaste';
import {reportInteraction} from '../../../utils/InteractionTracker';
import DataPreview, {DataValueExtractor, InspectorName} from './DataPreview';
import {getSortedKeys} from './utils';
import {colors} from '../colors';
import {clipboard} from 'electron';
import React from 'react';
import {TooltipOptions} from '../TooltipProvider';
import {useHighlighter, HighlightManager} from '../Highlight';

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
  parentPath: Array<string>;
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
  onExpanded?: ((path: string, expanded: boolean) => void) | undefined | null;
  /**
   * Callback whenever delete action is invoked on current path.
   */
  onDelete?: DataInspectorDeleteValue | undefined | null;
  /**
   * Render callback that can be used to customize the rendering of object keys.
   */
  onRenderName?: (
    path: Array<string>,
    name: string,
    highlighter: HighlightManager,
  ) => React.ReactElement;
  /**
   * Render callback that can be used to customize the rendering of object values.
   */
  onRenderDescription?: (description: React.ReactElement) => React.ReactElement;
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
  parentAncestry: Array<Object>;
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

  let stringValue: string;
  try {
    stringValue = JSON.stringify(data, null, 2);
  } catch (e) {
    stringValue = '<circular structure>';
  }
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

const recursiveMarker = <RecursiveBaseWrapper>Recursive</RecursiveBaseWrapper>;

/**
 * An expandable data inspector.
 *
 * This component is fairly low level. It's likely you're looking for
 * [`<ManagedDataInspector>`]().
 */
const DataInspector: React.FC<DataInspectorProps> = memo(
  function DataInspectorImpl({
    data,
    depth,
    diff,
    expandRoot,
    parentPath,
    onExpanded,
    onDelete,
    onRenderName,
    onRenderDescription,
    extractValue: extractValueProp,
    expanded: expandedPaths,
    name,
    parentAncestry,
    collapsed,
    tooltips,
    setValue: setValueProp,
  }) {
    const highlighter = useHighlighter();

    const shouldExpand = useRef(false);
    const expandHandle = useRef(undefined as any);
    const [renderExpanded, setRenderExpanded] = useState(false);
    const path = useMemo(
      () => (name === undefined ? parentPath : parentPath.concat([name])),
      [parentPath, name],
    );

    const extractValue = useCallback(
      (data: any, depth: number, path: string[]) => {
        let res;
        if (extractValueProp) {
          res = extractValueProp(data, depth, path);
        }
        if (!res) {
          res = defaultValueExtractor(data, depth, path);
        }
        return res;
      },
      [extractValueProp],
    );

    const res = useMemo(() => extractValue(data, depth, path), [
      extractValue,
      data,
      depth,
      path,
    ]);
    const resDiff = useMemo(() => extractValue(diff, depth, path), [
      extractValue,
      diff,
      depth,
      path,
    ]);
    const ancestry = useMemo(
      () => (res ? parentAncestry!.concat([res.value]) : []),
      [parentAncestry, res?.value],
    );

    let isExpandable = false;
    if (!res) {
      shouldExpand.current = false;
    } else {
      isExpandable = isValueExpandable(res.value);
    }

    if (isExpandable) {
      if (
        expandRoot === true ||
        shouldBeExpanded(expandedPaths, path, collapsed)
      ) {
        shouldExpand.current = true;
      } else if (resDiff) {
        shouldExpand.current = isComponentExpanded(
          res!.value,
          resDiff.type,
          resDiff.value,
        );
      }
    }

    useEffect(() => {
      if (!shouldExpand.current) {
        setRenderExpanded(false);
      } else {
        expandHandle.current = requestIdleCallback(() => {
          setRenderExpanded(true);
        });
      }
      return () => {
        cancelIdleCallback(expandHandle.current);
      };
    }, [shouldExpand.current]);

    const setExpanded = useCallback(
      (pathParts: Array<string>, isExpanded: boolean) => {
        if (!onExpanded || !expandedPaths) {
          return;
        }
        const path = pathParts.join('.');
        onExpanded(path, isExpanded);
      },
      [onExpanded, expandedPaths],
    );

    const handleClick = useCallback(() => {
      cancelIdleCallback(expandHandle.current);
      const isExpanded = shouldBeExpanded(expandedPaths, path, collapsed);
      reportInteraction('DataInspector', path.join(':'))(
        isExpanded ? 'collapsed' : 'expanded',
        undefined,
      );
      setExpanded(path, !isExpanded);
    }, [expandedPaths, path, collapsed]);

    const handleDelete = useCallback(
      (path: Array<string>) => {
        if (!onDelete) {
          return;
        }
        onDelete(path);
      },
      [onDelete],
    );

    /**
     * RENDERING
     */
    if (!res) {
      return null;
    }

    // the data inspector makes values read only when setValue isn't set so we just need to set it
    // to null and the readOnly status will be propagated to all children
    const setValue = res.mutable ? setValueProp : null;
    const {value, type, extra} = res;

    if (parentAncestry!.includes(value)) {
      return recursiveMarker;
    }

    let expandGlyph = '';
    if (isExpandable) {
      if (shouldExpand.current) {
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
    if (isExpandable && renderExpanded) {
      const propertyNodes = [];

      const diffValue = diff && resDiff ? resDiff.value : null;

      const keys = getSortedKeys({...value, ...diffValue});

      for (const key of keys) {
        const diffMetadataArr = diffMetadataExtractor(value, key, diffValue);
        for (const metadata of diffMetadataArr) {
          const dataInspectorNode = (
            <DataInspector
              parentAncestry={ancestry}
              extractValue={extractValue}
              setValue={setValue}
              expanded={expandedPaths}
              collapsed={collapsed}
              onExpanded={onExpanded}
              onDelete={onDelete}
              onRenderName={onRenderName}
              onRenderDescription={onRenderDescription}
              parentPath={path}
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
      const text = onRenderName
        ? onRenderName(path, name, highlighter)
        : highlighter.render(name);
      nameElems.push(
        <Tooltip
          title={tooltips != null && tooltips[name]}
          key="name"
          options={nameTooltipOptions}>
          <InspectorName>{text}</InspectorName>
        </Tooltip>,
      );
      nameElems.push(<span key="sep">: </span>);
    }

    // create description or preview
    let descriptionOrPreview;
    if (renderExpanded || !isExpandable) {
      descriptionOrPreview = (
        <DataDescription
          path={path}
          setValue={setValue}
          type={type}
          value={value}
          extra={extra}
        />
      );

      descriptionOrPreview = onRenderDescription
        ? onRenderDescription(descriptionOrPreview)
        : descriptionOrPreview;
    } else {
      descriptionOrPreview = (
        <DataPreview
          path={path}
          type={type}
          value={value}
          extractValue={extractValue}
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
    if (renderExpanded) {
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
          label: shouldExpand.current ? 'Collapse' : 'Expand',
          click: handleClick,
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
        click: () => handleDelete(path),
      });
    }

    return (
      <BaseContainer
        depth={depth}
        disabled={!!setValueProp && !!setValue === false}>
        <ContextMenu component="span" items={contextMenuItems}>
          <PropertyContainer onClick={isExpandable ? handleClick : undefined}>
            {expandedPaths && <ExpandControl>{expandGlyph}</ExpandControl>}
            {descriptionOrPreview}
            {wrapperStart}
          </PropertyContainer>
        </ContextMenu>
        {propertyNodesContainer}
        {wrapperEnd}
      </BaseContainer>
    );
  },
  dataInspectorPropsAreEqual,
);

function shouldBeExpanded(
  expanded: DataInspectorExpanded,
  pathParts: Array<string>,
  collapsed?: boolean,
) {
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
  if (collapsed === true) {
    return false;
  }

  // by default all items are expanded
  return true;
}

function dataInspectorPropsAreEqual(
  props: DataInspectorProps,
  nextProps: DataInspectorProps,
) {
  // Optimization: it would be much faster to not pass the expanded tree
  // down the tree, but rather introduce an ExpandStateManager, and subscribe per node

  // check if any expanded paths effect this subtree
  if (nextProps.expanded !== props.expanded) {
    const path = !nextProps.name
      ? '' // root
      : !nextProps.parentPath.length
      ? nextProps.name // root element
      : nextProps.parentPath.join('.') + '.' + nextProps.name;

    // we are being collapsed
    if (props.expanded[path] !== nextProps.expanded[path]) {
      return false;
    }

    // one of our children was expande
    for (const key in nextProps.expanded) {
      if (key.startsWith(path) === false) {
        // this key doesn't effect us
        continue;
      }

      if (nextProps.expanded[key] !== props.expanded[key]) {
        return false;
      }
    }
  }

  // basic equality checks for the rest
  return (
    nextProps.data === props.data &&
    nextProps.diff === props.diff &&
    nextProps.name === props.name &&
    nextProps.depth === props.depth &&
    nextProps.parentPath === props.parentPath &&
    nextProps.onExpanded === props.onExpanded &&
    nextProps.onDelete === props.onDelete &&
    nextProps.setValue === props.setValue &&
    nextProps.collapsed === props.collapsed &&
    nextProps.expandRoot === props.expandRoot
  );
}

function isValueExpandable(data: any) {
  return (
    typeof data === 'object' && data !== null && Object.keys(data).length > 0
  );
}

export default DataInspector;
