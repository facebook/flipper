/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {Children} from 'react';
import {Tabs as AntdTabs, TabsProps, TabPaneProps} from 'antd';
import {css, cx} from '@emotion/css';
import {Layout} from './Layout';
import {Spacing} from './theme';
import {useLocalStorageState} from '../utils/useLocalStorageState';

/**
 * A Tabs component.
 */
export function Tabs({
  grow,
  children,
  className,
  localStorageKeyOverride, //set this if you need to have a dynamic number of tabs, you do *not* need to namespace with the plugin name
  ...baseProps
}: {grow?: boolean; localStorageKeyOverride?: string} & TabsProps) {
  const keys: string[] = [];
  const keyedChildren = Children.map(children, (child: any, idx) => {
    if (!child || typeof child !== 'object') {
      return;
    }
    const tabKey =
      (child.props.hasOwnProperty('tabKey') &&
        typeof child.props.tabKey === 'string' &&
        child.props.tabKey) ||
      (child.props.hasOwnProperty('tab') &&
        typeof child.props.tab === 'string' &&
        child.props.tab) ||
      (child.props.hasOwnProperty('key') &&
        typeof child.props.key === 'string' &&
        child.props.key) ||
      `tab_${idx}`;
    keys.push(tabKey);
    return {
      ...child,
      props: {
        ...child.props,
        key: tabKey,
        tabKey,
      },
    };
  });

  const [activeTab, setActiveTab] = useLocalStorageState<string | undefined>(
    'Tabs:' + localStorageKeyOverride ?? keys.join(','),
    undefined,
  );

  return (
    <AntdTabs
      activeKey={activeTab}
      onChange={(key) => {
        setActiveTab(key);
      }}
      {...baseProps}
      className={cx(
        className,
        baseTabs,
        grow !== false ? growingTabs : undefined,
      )}>
      {keyedChildren}
    </AntdTabs>
  );
}

export const Tab: React.FC<
  TabPaneProps & {
    pad?: Spacing;
    gap?: Spacing;
  }
> = function Tab({pad, gap, children, ...baseProps}) {
  return (
    <AntdTabs.TabPane {...baseProps}>
      <Layout.Container gap={gap} pad={pad} grow style={{maxWidth: '100%'}}>
        {children}
      </Layout.Container>
    </AntdTabs.TabPane>
  );
};

const baseTabs = css`
  & .ant-tabs-nav {
    margin: 0;
    padding-left: 8px;
    padding-right: 8px;
  }
`;

const growingTabs = css`
  flex: 1;
  & .tabpanel {
    display: flex;
  }
  & .ant-tabs-content {
    height: 100%;
  }
  & .ant-tabs-tabpane:not(.ant-tabs-tabpane-hidden) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
`;
