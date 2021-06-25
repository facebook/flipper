/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {Collapse} from 'antd';
import {TrackingScope} from './Tracked';
import {useLocalStorageState} from '../utils/useLocalStorageState';
import {useCallback} from 'react';
import styled from '@emotion/styled';
import {Spacing, theme} from './theme';
import {Layout} from './Layout';

export const Panel: React.FC<{
  title: string;
  /**
   * Whether the panel can be collapsed. Defaults to true
   */
  collapsible?: boolean;
  /**
   * Initial state for panel if it is collapsable
   */
  collapsed?: boolean;
  pad?: Spacing;
  gap?: Spacing;
  extraActions?: React.ReactElement | null;
}> = (props) => {
  const [collapsed, setCollapsed] = useLocalStorageState(
    `panel:${props.title}:collapsed`,
    props.collapsible === false ? false : props.collapsed,
  );

  const toggle = useCallback(() => {
    if (props.collapsible === false) {
      return;
    }
    setCollapsed((c) => !c);
  }, [setCollapsed, props.collapsible]);

  return (
    <TrackingScope scope={props.title}>
      <StyledCollapse
        bordered={false}
        activeKey={collapsed ? undefined : props.title}
        onChange={toggle}>
        <Collapse.Panel
          key={props.title}
          header={
            props.extraActions ? (
              <Layout.Right center>
                <span>{props.title}</span>
                {props.extraActions}
              </Layout.Right>
            ) : (
              props.title
            )
          }
          showArrow={props.collapsible !== false}>
          <Layout.Container pad={props.pad} gap={props.pad}>
            {props.children}
          </Layout.Container>
        </Collapse.Panel>
      </StyledCollapse>
    </TrackingScope>
  );
};

Panel.defaultProps = {
  collapsed: false,
  collapsible: true,
};

const StyledCollapse = styled(Collapse)({
  background: theme.backgroundDefault,
  borderRadius: 0,
  '& > .ant-collapse-item .ant-collapse-header': {
    background: theme.backgroundWash,
    paddingTop: theme.space.tiny,
    paddingBottom: theme.space.tiny,
    fontWeight: 'bold',
    display: 'flex',
    '> .anticon': {
      padding: `5px 0px`,
      left: 8,
      fontSize: '10px',
      fontWeight: theme.bold,
    },
  },
  '& > .ant-collapse-item': {
    borderBottom: 'none',
  },
  '& > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box':
    {
      padding: 0,
    },
});
