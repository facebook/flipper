/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  useCallback,
  memo,
  createRef,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {DataFormatter} from './DataFormatter';
import {Layout} from './Layout';
import {Typography} from 'antd';
import {
  DataTable,
  DataTableColumn,
  DataTableProps,
  ItemRenderer,
} from './data-table/DataTable';
import {RightOutlined} from '@ant-design/icons';
import {theme} from './theme';
import styled from '@emotion/styled';
import {DataTableManager} from './data-table/DataTableManager';
import {Atom, createState} from '../state/atom';
import {useAssertStableRef} from '../utils/useAssertStableRef';
import {DataSource} from '../data-source';

const {Text} = Typography;

interface Item {
  id: string;
  title: string;
  description?: string;
}

interface DataListBaseProps<T extends Item> {
  /**
   * Defines the styling of the component. By default shows a list, but alternatively the items can be displayed in a drop down
   */
  type?: 'default' /* | 'compact' | 'dropdown' */;
  /**
   * By default the data list will take all available space and scroll if items aren't otherwise visible.
   * By setting `scrollable={false}` the list will only take its natural size
   */
  scrollable?: boolean;
  /**
   * The current selection
   */
  selection: Atom<string | undefined>;
  /**
   * Handler that is fired if selection is changed
   */
  onSelect?(id: string | undefined, value: T | undefined): void;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Items to display. Per item at least a title and unique id should be provided
   */
  items: DataSource<Item> | readonly Item[];
  /**
   * Custom render function. By default the component will render the `title` in bold and description (if any) below it
   */
  onRenderItem?: ItemRenderer<T>;
  /**
   * Show a right arrow by default
   */
  enableArrow?: boolean;
}

export type DataListProps<T extends Item> = DataListBaseProps<T> &
  // Some table props are set by DataList instead, so override them
  Omit<DataTableProps<T>, 'records' | 'dataSource' | 'columns' | 'onSelect'>;

export const DataList: React.FC<DataListProps<any>> = function DataList<
  T extends Item,
>({
  selection: baseSelection,
  onSelect,
  className,
  style,
  items,
  onRenderItem,
  enableArrow,
  ...tableProps
}: DataListProps<T>) {
  // if a tableManagerRef is provided, we piggy back on that same ref
  // eslint-disable-next-line
  const tableManagerRef = tableProps.tableManagerRef ?? createRef<undefined | DataTableManager<T>>();

  useAssertStableRef(baseSelection, 'selection');
  useAssertStableRef(onRenderItem, 'onRenderItem');
  useAssertStableRef(enableArrow, 'enableArrow');

  // create local selection atom if none provided
  // eslint-disable-next-line
  const selection = baseSelection ?? useState(() => createState<string|undefined>())[0];

  const handleSelect = useCallback(
    (item: T | undefined) => {
      selection.set(item?.id);
    },
    [selection],
  );

  const dataListColumns: DataTableColumn<T>[] = useMemo(
    () => [
      {
        key: 'id' as const,
        wrap: true,
        onRender(item: T, selected: boolean, index: number) {
          return onRenderItem ? (
            onRenderItem(item, selected, index)
          ) : (
            <DataListItem
              title={item.title}
              description={item.description}
              enableArrow={enableArrow}
            />
          );
        },
      },
    ],
    [onRenderItem, enableArrow],
  );

  useEffect(
    function updateSelection() {
      return selection.subscribe((valueFromAtom) => {
        const m = tableManagerRef.current;
        if (!m) {
          return;
        }
        if (!valueFromAtom && m.getSelectedItem()) {
          m.clearSelection();
        } else if (valueFromAtom && m.getSelectedItem()?.id !== valueFromAtom) {
          // find valueFromAtom in the selection
          m.selectItemById(valueFromAtom);
        }
      });
    },
    [selection, tableManagerRef],
  );

  return (
    <Layout.Container style={style} className={className} grow>
      <DataTable<any>
        {...tableProps}
        tableManagerRef={tableManagerRef}
        records={Array.isArray(items) ? items : undefined}
        dataSource={Array.isArray(items) ? undefined : (items as any)}
        recordsKey="id"
        columns={dataListColumns}
        onSelect={handleSelect}
      />
    </Layout.Container>
  );
};

DataList.defaultProps = {
  type: 'default',
  scrollable: true,
  enableSearchbar: false,
  enableColumnHeaders: false,
  enableArrow: true,
  enableContextMenu: false,
  enableMultiSelect: false,
};

const DataListItem = memo(
  ({
    title,
    description,
    enableArrow,
  }: {
    // TODO: add icon support
    title: string;
    description?: string;
    enableArrow?: boolean;
  }) => {
    return (
      <Layout.Horizontal center grow shrink padv>
        <Layout.Container grow shrink>
          <Text strong ellipsis>
            {DataFormatter.format(title)}
          </Text>
          {description != null && (
            <Text type="secondary" ellipsis>
              {DataFormatter.format(description)}
            </Text>
          )}
        </Layout.Container>
        {enableArrow && (
          <ArrowWrapper>
            <RightOutlined />
          </ArrowWrapper>
        )}
      </Layout.Horizontal>
    );
  },
);

const ArrowWrapper = styled.div({
  flex: 0,
  paddingLeft: theme.space.small,
  '.anticon': {
    lineHeight: '14px',
  },
});
