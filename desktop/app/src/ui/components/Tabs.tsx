/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FlexColumn from './FlexColumn';
import styled from '@emotion/styled';
import Orderable from './Orderable';
import FlexRow from './FlexRow';
import {colors} from './colors';
import Tab, {Props as TabProps} from './Tab';
import {Property} from 'csstype';
import React, {useContext} from 'react';
import {TabsContext} from './TabsContainer';
import {_wrapInteractionHandler} from 'flipper-plugin';

const TabList = styled(FlexRow)({
  justifyContent: 'center',
  alignItems: 'stretch',
});
TabList.displayName = 'Tabs:TabList';

const TabListItem = styled.div<{
  active?: boolean;
  width?: Property.Width<number>;
  container?: boolean;
}>((props) => ({
  userSelect: 'none',
  background: props.container
    ? props.active
      ? 'linear-gradient(to bottom, #67a6f7 0%, #0072FA 100%)'
      : `linear-gradient(to bottom, white 0%,${colors.macOSTitleBarButtonBackgroundBlur} 100%)`
    : props.active
    ? colors.light15
    : colors.light02,
  borderBottom: props.container ? '1px solid #B8B8B8' : '1px solid #dddfe2',
  boxShadow:
    props.active && props.container
      ? 'inset 0px 0px 3px rgba(0,0,0,0.25)'
      : 'none',
  color: props.container && props.active ? colors.white : colors.dark80,
  flex: props.container ? 'unset' : 1,
  top: props.container ? -11 : 0,
  fontWeight: 500,
  fontSize: 13,
  lineHeight: props.container ? '22px' : '28px',
  overflow: 'hidden',
  padding: '0 10px',
  position: 'relative',
  textAlign: 'center',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:first-child': {
    borderTopLeftRadius: props.container ? 3 : 0,
    borderBottomLeftRadius: props.container ? 3 : 0,
  },
  '&:last-child': {
    borderTopRightRadius: props.container ? 3 : 0,
    borderBottomRightRadius: props.container ? 3 : 0,
  },
  '&:hover': {
    backgroundColor: props.active ? colors.light15 : colors.light05,
  },
}));
TabListItem.displayName = 'Tabs:TabListItem';

const TabListAddItem = styled(TabListItem)({
  borderRight: 'none',
  flex: 0,
  flexGrow: 0,
  fontWeight: 'bold',
});
TabListAddItem.displayName = 'Tabs:TabListAddItem';

const CloseButton = styled.div({
  color: '#000',
  float: 'right',
  fontSize: 10,
  fontWeight: 'bold',
  textAlign: 'center',
  marginLeft: 6,
  marginTop: 6,
  width: 16,
  height: 16,
  lineHeight: '16px',
  borderRadius: '50%',

  '&:hover': {
    backgroundColor: colors.cherry,
    color: '#fff',
  },
});
CloseButton.displayName = 'Tabs:CloseButton';

const OrderableContainer = styled.div({
  display: 'inline-block',
});
OrderableContainer.displayName = 'Tabs:OrderableContainer';

const TabContent = styled.div({
  height: '100%',
  overflow: 'auto',
  width: '100%',
  display: 'flex',
});
TabContent.displayName = 'Tabs:TabContent';

/**
 * A Tabs component.
 * @deprecated use Tabs from flipper-plugin
 */
export default function Tabs(props: {
  /**
   * Callback for when the active tab has changed.
   */
  onActive?: (key: string | null | undefined) => void;
  /**
   * The key of the default active tab.
   */
  defaultActive?: string;
  /**
   * The key of the currently active tab.
   */
  active?: string | null | undefined;
  /**
   * Tab elements.
   */
  children?: React.ReactElement<TabProps>[] | React.ReactElement<TabProps>;
  /**
   * Whether the tabs can be reordered by the user.
   */
  orderable?: boolean;
  /**
   * Callback when the tab order changes.
   */
  onOrder?: (order: Array<string>) => void;
  /**
   * Order of tabs.
   */
  order?: Array<string>;
  /**
   * Whether to include the contents of every tab in the DOM and just toggle
   * its visibility.
   */
  persist?: boolean;
  /**
   * Whether to include a button to create additional items.
   */
  newable?: boolean;
  /**
   * Callback for when the new button is clicked.
   */
  onNew?: () => void;
  /**
   * Elements to insert before all tabs in the tab list.
   */
  before?: Array<React.ReactNode>;
  /**
   * Elements to insert after all tabs in the tab list.
   */
  after?: Array<React.ReactNode>;
  /**
   * By default tabs are rendered in mac-style tabs, with a negative offset.
   * By setting classic mode the classic style is rendered.
   */
  classic?: boolean;
}) {
  let tabsContainer = useContext(TabsContext);
  const scope = useContext((global as any).FlipperTrackingScopeContext);
  if (props.classic === true) {
    tabsContainer = false;
  }

  const {onActive} = props;
  const active: string | undefined =
    props.active == null ? props.defaultActive : props.active;

  // array of other components that aren't tabs
  const before = props.before || [];
  const after = props.after || [];

  //
  const tabs: {
    [key: string]: React.ReactNode;
  } = {};

  // a list of keys
  const keys = props.order ? props.order.slice() : [];

  const tabContents: React.ReactNode[] = [];
  const tabSiblings: React.ReactNode[] = [];

  function add(comps: React.ReactElement | React.ReactElement[]) {
    const compsArray: React.ReactElement<TabProps>[] = Array.isArray(comps)
      ? comps
      : [comps];
    for (const comp of compsArray) {
      if (Array.isArray(comp)) {
        add(comp);
        continue;
      }

      if (!comp) {
        continue;
      }

      if (comp.type !== Tab) {
        // if element isn't a tab then just push it into the tab list
        tabSiblings.push(comp);
        continue;
      }

      const {children, closable, label, onClose, width} = comp.props;

      const key = comp.key == null ? label : comp.key;
      if (typeof key !== 'string') {
        throw new Error('tab needs a string key or a label');
      }
      if (!keys.includes(key)) {
        keys.push(key);
      }

      const isActive: boolean = active === key;
      if (isActive || props.persist === true || comp.props.persist === true) {
        tabContents.push(
          <TabContent key={key} hidden={!isActive}>
            {children}
          </TabContent>,
        );
      }

      // this tab has been hidden from the tab bar but can still be selected if its key is active
      if (comp.props.hidden) {
        continue;
      }

      let closeButton: HTMLDivElement | undefined | null;

      tabs[key] = (
        <TabListItem
          key={key}
          width={width}
          active={isActive}
          container={tabsContainer}
          onMouseDown={
            !isActive && onActive
              ? _wrapInteractionHandler(
                  (event: React.MouseEvent<HTMLDivElement>) => {
                    if (event.target !== closeButton) {
                      onActive(key);
                    }
                  },
                  'Tabs',
                  'onTabClick',
                  scope as any,
                  'tab:' + key + ':' + comp.props.label,
                )
              : undefined
          }>
          {comp.props.label}
          {closable && (
            <CloseButton // eslint-disable-next-line react/jsx-no-bind
              ref={(ref) => (closeButton = ref)} // eslint-disable-next-line react/jsx-no-bind
              onMouseDown={() => {
                if (isActive && onActive) {
                  const index = keys.indexOf(key);
                  const newActive = keys[index + 1] || keys[index - 1] || null;
                  onActive(newActive);
                }
                if (onClose) {
                  onClose();
                }
              }}>
              X
            </CloseButton>
          )}
        </TabListItem>
      );
    }
  }

  if (props.children) {
    add(props.children);
  }

  let tabList: React.ReactNode;
  if (props.orderable === true) {
    tabList = (
      <OrderableContainer key="orderable-list">
        <Orderable
          orientation="horizontal"
          items={tabs}
          onChange={props.onOrder}
          order={keys}
        />
      </OrderableContainer>
    );
  } else {
    tabList = [];
    for (const key in tabs) {
      (tabList as Array<React.ReactNode>).push(tabs[key]);
    }
  }

  if (props.newable === true) {
    after.push(
      <TabListAddItem key={keys.length} onMouseDown={props.onNew}>
        +
      </TabListAddItem>,
    );
  }

  return (
    <FlexColumn grow={true}>
      <TabList>
        {before}
        {tabList}
        {after}
      </TabList>
      {tabContents}
      {tabSiblings}
    </FlexColumn>
  );
}
