/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, memo} from 'react';
import {DataFormatter} from './DataFormatter';
import {Layout} from './Layout';
import {theme} from './theme';
import {Typography} from 'antd';

const {Text} = Typography;

interface Item {
  id: string;
  title: string;
  description?: string;
}

interface DataListProps<T extends Item> {
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
  value?: string /* | Atom<string>*/;
  /**
   * Handler that is fired if selection is changed
   */
  onSelect?(id: string, value: T): void;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Items to display. Per item at least a title and unique id should be provided
   */
  items: readonly Item[];
  /**
   * Custom render function. By default the component will render the `title` in bold and description (if any) below it
   */
  onRenderItem?: (item: T, selected: boolean) => React.ReactElement;
}

export const DataList: React.FC<DataListProps<any>> = function DataList<
  T extends Item
>({
  // type,
  scrollable,
  value,
  onSelect,
  className,
  style,
  items,
  onRenderItem,
}: DataListProps<T>) {
  const handleSelect = useCallback(
    (key: string, item: T) => {
      onSelect?.(key, item);
    },
    [onSelect],
  );

  const renderedItems = items.map((item) => (
    <DataListItemWrapper
      item={item}
      key={item.id}
      selected={item.id === value}
      onRenderItem={onRenderItem as any}
      onSelect={handleSelect as any}
    />
  ));

  return scrollable ? (
    <Layout.Container
      style={style}
      className={className}
      borderTop
      borderBottom
      grow>
      <Layout.ScrollContainer vertical>{renderedItems}</Layout.ScrollContainer>
    </Layout.Container>
  ) : (
    <Layout.Container style={style} className={className} borderTop>
      {renderedItems}
    </Layout.Container>
  );
};

DataList.defaultProps = {
  type: 'default',
  scrollable: false,
  onRenderItem: defaultItemRenderer,
};

function defaultItemRenderer(item: Item, _selected: boolean) {
  return <DataListItem title={item.title} description={item.description} />;
}

const DataListItemWrapper = memo(
  ({
    item,
    onRenderItem,
    onSelect,
    selected,
  }: {
    item: Item;
    onRenderItem: typeof defaultItemRenderer;
    onSelect: (id: string, item: Item) => void;
    selected: boolean;
  }) => {
    return (
      <Layout.Container
        pad
        borderBottom
        key={item.id}
        style={{
          background: selected ? theme.backgroundWash : undefined,
          borderLeft: selected
            ? `4px solid ${theme.primaryColor}`
            : `4px solid transparent`,
        }}
        onClick={() => {
          onSelect(item.id, item);
        }}>
        {onRenderItem(item, selected)}
      </Layout.Container>
    );
  },
);

const DataListItem = memo(
  ({title, description}: {title: string; description?: string}) => {
    return (
      <>
        <Text strong>{DataFormatter.format(title)}</Text>
        {description != null && (
          <Text type="secondary">{DataFormatter.format(description)}</Text>
        )}
      </>
    );
  },
);
