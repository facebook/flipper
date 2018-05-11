/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import FlexColumn from './FlexColumn.js';
import styled from '../styled/index.js';
import Orderable from './Orderable.js';
import FlexRow from './FlexRow.js';
import {colors} from './colors.js';
import Tab from './Tab.js';

const TabList = FlexRow.extends({
  alignItems: 'stretch',
});

const TabListItem = styled.view(
  {
    backgroundColor: props => (props.active ? colors.light15 : colors.light02),
    borderBottom: '1px solid #dddfe2',
    boxShadow: props =>
      props.active ? 'inset 0px 0px 3px rgba(0,0,0,0.25)' : 'none',
    color: colors.dark80,
    flex: 1,
    fontSize: 13,
    lineHeight: '28px',
    overflow: 'hidden',
    padding: '0 10px',
    position: 'relative',
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',

    '&:hover': {
      backgroundColor: props =>
        props.active ? colors.light15 : colors.light05,
    },
  },
  {
    ignoreAttributes: ['active'],
  },
);

const TabListAddItem = TabListItem.extends({
  borderRight: 'none',
  flex: 0,
  flexGrow: 0,
  fontWeight: 'bold',
});

const CloseButton = styled.view({
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

const OrderableContainer = styled.view({
  display: 'inline-block',
});

const TabContent = styled.view({
  height: '100%',
  overflow: 'auto',
  width: '100%',
});

/**
 * A Tabs component.
 */
export default function Tabs(props: {|
  /**
   * Callback for when the active tab has changed.
   */
  onActive?: (key: ?string) => void,
  /**
   * The key of the default active tab.
   */
  defaultActive?: string,
  /**
   * The key of the currently active tab.
   */
  active?: ?string,
  /**
   * Tab elements.
   */
  children?: Array<React$Element<any>>,
  /**
   * Whether the tabs can be reordered by the user.
   */
  orderable?: boolean,
  /**
   * Callback when the tab order changes.
   */
  onOrder?: (order: Array<string>) => void,
  /**
   * Order of tabs.
   */
  order?: Array<string>,
  /**
   * Whether to include the contents of every tab in the DOM and just toggle
   * it's visibility.
   */
  persist?: boolean,
  /**
   * Whether to include a button to create additional items.
   */
  newable?: boolean,
  /**
   * Callback for when the new button is clicked.
   */
  onNew?: () => void,
  /**
   * Elements to insert before all tabs in the tab list.
   */
  before?: Array<React$Node>,
  /**
   * Elements to insert after all tabs in the tab list.
   */
  after?: Array<React$Node>,
|}) {
  const {onActive} = props;
  const active: ?string =
    props.active == null ? props.defaultActive : props.active;

  // array of other components that aren't tabs
  const before = props.before || [];
  const after = props.after || [];

  //
  const tabs = {};

  // a list of keys
  const keys = props.order ? props.order.slice() : [];

  const tabContents = [];
  const tabSiblings = [];

  function add(comps) {
    for (const comp of [].concat(comps || [])) {
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

      // this tab has been hidden from the tab bar but can still be selected if it's key is active
      if (comp.props.hidden) {
        continue;
      }

      let closeButton;

      tabs[key] = (
        <TabListItem
          key={key}
          width={width}
          active={isActive}
          onMouseDown={
            !isActive &&
            onActive &&
            ((event: SyntheticMouseEvent<>) => {
              if (event.target !== closeButton) {
                onActive(key);
              }
            })
          }>
          {comp.props.label}
          {closable && (
            <CloseButton // eslint-disable-next-line react/jsx-no-bind
              innerRef={ref => (closeButton = ref)} // eslint-disable-next-line react/jsx-no-bind
              onMouseDown={() => {
                if (isActive && onActive) {
                  const index = keys.indexOf(key);
                  const newActive = keys[index + 1] || keys[index - 1] || null;
                  onActive(newActive);
                }

                onClose();
              }}>
              X
            </CloseButton>
          )}
        </TabListItem>
      );
    }
  }

  add(props.children);

  let tabList;
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
      tabList.push(tabs[key]);
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
    <FlexColumn fill={true}>
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
