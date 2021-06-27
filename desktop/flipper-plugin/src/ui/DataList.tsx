/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, createRef, useMemo, useEffect, useCallback} from 'react';
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
import {useAssertStableRef} from '../utils/useAssertStableRef';
import {DataSource} from '../data-source';
import {useMakeStableCallback} from '../utils/useMakeStableCallback';

const {Text} = Typography;

type DataListBaseProps<Item> = {
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
   * Handler that is fired if selection is changed
   */
  selection?: string | undefined;
  onSelect?(id: string | undefined, value: Item | undefined): void;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Items to display. Per item at least a title and unique id should be provided
   */
  items: DataSource<Item> | readonly Item[];
  /**
   * Custom render function. By default the component will render the `title` in bold and description (if any) below it
   */
  onRenderItem?: ItemRenderer<Item>;
  /**
   * The attributes that will be picked as id/title/description for the default rendering.
   * Defaults to id/title/description, but can be customized
   */

  titleAttribute?: keyof Item & string;
  descriptionAttribute?: keyof Item & string;
  /**
   * Show a right arrow by default
   */
  enableArrow?: boolean;
} & (Item extends {id: string}
  ? {
      idAttribute?: keyof Item & string; // optional if id field is present
    }
  : {
      idAttribute: keyof Item & string;
    });

export type DataListProps<Item> = DataListBaseProps<Item> &
  // Some table props are set by DataList instead, so override them
  Omit<DataTableProps<Item>, 'records' | 'dataSource' | 'columns' | 'onSelect'>;

export const DataList: (<T>(props: DataListProps<T>) => React.ReactElement) & {
  Item: React.FC<DataListItemProps>;
} = Object.assign(
  function <T>({
    onSelect: baseOnSelect,
    selection,
    className,
    style,
    items,
    onRenderItem,
    enableArrow,
    idAttribute,
    titleAttribute,
    descriptionAttribute,
    ...tableProps
  }: DataListProps<T>) {
    // if a tableManagerRef is provided, we piggy back on that same ref
    // eslint-disable-next-line
    const tableManagerRef = tableProps.tableManagerRef ?? createRef<undefined | DataTableManager<T>>();

    useAssertStableRef(onRenderItem, 'onRenderItem');
    useAssertStableRef(enableArrow, 'enableArrow');
    const onSelect = useMakeStableCallback(baseOnSelect);

    const handleSelect = useCallback(
      (item: T | undefined) => {
        if (!item) {
          onSelect?.(undefined, undefined);
        } else {
          const id = '' + item[idAttribute!];
          if (id == null) {
            throw new Error(`No valid identifier for attribute ${idAttribute}`);
          }
          onSelect?.(id, item);
        }
      },
      [onSelect, idAttribute],
    );

    useEffect(() => {
      if (selection) {
        tableManagerRef.current?.selectItemById(selection);
      } else {
        tableManagerRef.current?.clearSelection();
      }
    }, [selection, tableManagerRef]);

    const dataListColumns: DataTableColumn<T>[] = useMemo(
      () => [
        {
          key: idAttribute!,
          wrap: true,
          onRender(item: T, selected: boolean, index: number) {
            return onRenderItem ? (
              onRenderItem(item, selected, index)
            ) : (
              <DataList.Item
                title={item[titleAttribute!] as any}
                description={item[descriptionAttribute!] as any}
                enableArrow={enableArrow}
              />
            );
          },
        },
      ],
      [
        onRenderItem,
        enableArrow,
        titleAttribute,
        descriptionAttribute,
        idAttribute,
      ],
    );

    return (
      <Layout.Container style={style} className={className} grow>
        <DataTable<any>
          {...tableProps}
          tableManagerRef={tableManagerRef}
          records={Array.isArray(items) ? items : undefined!}
          dataSource={Array.isArray(items) ? undefined! : (items as any)}
          recordsKey={idAttribute}
          columns={dataListColumns}
          onSelect={handleSelect}
        />
      </Layout.Container>
    );
  },
  {
    Item: memo(({title, description, enableArrow}: DataListItemProps) => {
      return (
        <Layout.Horizontal center grow shrink padv>
          <Layout.Container grow shrink>
            {typeof title === 'string' ? (
              <Text strong ellipsis>
                {DataFormatter.format(title)}
              </Text>
            ) : (
              title
            )}
            {typeof description === 'string' ? (
              <Text type="secondary" ellipsis>
                {DataFormatter.format(description)}
              </Text>
            ) : (
              description
            )}
          </Layout.Container>
          {enableArrow && (
            <ArrowWrapper>
              <RightOutlined />
            </ArrowWrapper>
          )}
        </Layout.Horizontal>
      );
    }),
  },
);

(DataList as React.FC<DataListProps<any>>).defaultProps = {
  type: 'default',
  scrollable: true,
  enableSearchbar: false,
  enableColumnHeaders: false,
  enableArrow: true,
  enableContextMenu: false,
  enableMultiSelect: false,
  idAttribute: 'id',
  titleAttribute: 'title',
  descriptionAttribute: 'description',
};
(DataList.Item as React.FC<DataListItemProps>).defaultProps = {
  enableArrow: true,
};

interface DataListItemProps {
  // TODO: add icon support
  title?: string | React.ReactElement;
  description?: string | React.ReactElement;
  enableArrow?: boolean;
}

const ArrowWrapper = styled.div({
  flex: 0,
  paddingLeft: theme.space.small,
  '.anticon': {
    lineHeight: '14px',
  },
});
