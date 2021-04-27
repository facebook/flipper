/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
  ...baseProps
}: {grow?: boolean} & TabsProps) {
  const keys: string[] = [];
  const keyedChildren = Children.map(children, (child: any, idx) => {
    if (!child || typeof child !== 'object') {
      return;
    }
    const tabKey =
      (typeof child.props.tab === 'string' && child.props.tab) || `tab_${idx}`;
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
    'Tabs:' + keys.join(','),
    undefined,
  );

  return (
    <AntdTabs
      activeKey={activeTab}
      onChange={(key) => {
        setActiveTab(key);
      }}
      {...baseProps}
      className={cx(className, grow !== false ? growingTabs : undefined)}>
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
      <Layout.Container gap={gap} pad={pad} grow>
        {children}
      </Layout.Container>
    </AntdTabs.TabPane>
  );
};

const growingTabs = css`
  flex: 1;
  & .tabpanel {
    display: flex;
  }
  & .ant-tabs-content {
    height: 100%;
  }
  & .ant-tabs-tabpane {
    display: flex;
  }
`;
