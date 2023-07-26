/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Slider, Tooltip, Typography} from 'antd';
import {Layout, produce, theme, usePlugin} from 'flipper-plugin';
import {Id} from '../../ClientTypes';
import {plugin} from '../../index';
import React from 'react';
import {
  AimOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';

export type TargetModeState =
  | {
      state: 'selected';
      targetedNodes: Id[];
      sliderPosition: number;
    }
  | {
      state: 'active';
    }
  | {
      state: 'disabled';
    };

export function VisualiserControls({
  targetMode,
  setTargetMode,
  selectedNode,
  focusedNode,
}: {
  selectedNode?: Id;
  focusedNode?: Id;
  setTargetMode: (targetMode: TargetModeState) => void;
  targetMode: TargetModeState;
}) {
  const instance = usePlugin(plugin);

  const focusDisabled = focusedNode == null && selectedNode == null;
  const focusToolTip = focusDisabled
    ? 'Select a node to focus it'
    : focusedNode == null
    ? 'Focus current node'
    : 'Remove focus';

  const targetToolTip =
    targetMode.state === 'disabled' ? 'TargetMode' : 'Exit target mode';

  return (
    <Layout.Right style={{padding: theme.space.medium}} gap="medium" center>
      <Layout.Container style={{userSelect: 'none'}}>
        {targetMode.state === 'active' && (
          <Typography.Text strong>Target mode: Select element</Typography.Text>
        )}
        {targetMode.state === 'disabled' && (
          <Typography.Text strong>Interactive Visualizer</Typography.Text>
        )}
        {targetMode.state === 'selected' && (
          <Slider
            min={0}
            tooltipVisible={false}
            value={targetMode.sliderPosition}
            max={targetMode.targetedNodes.length - 1}
            onChange={(value) => {
              setTargetMode(
                produce(targetMode, (draft) => {
                  draft.sliderPosition = value;
                }),
              );
              instance.uiActions.onSelectNode(
                targetMode.targetedNodes[value],
                'visualiser',
              );
            }}
          />
        )}
      </Layout.Container>

      <Layout.Horizontal gap="medium">
        <Tooltip title={targetToolTip}>
          <Button
            onClick={() => {
              if (targetMode.state === 'disabled') {
                setTargetMode({state: 'active'});
              } else {
                setTargetMode({state: 'disabled'});
              }
            }}
            icon={
              <AimOutlined
                style={{
                  color:
                    targetMode.state === 'disabled'
                      ? theme.black
                      : theme.primaryColor,
                }}
              />
            }
          />
        </Tooltip>
        <Tooltip title={focusToolTip}>
          <Button
            disabled={focusDisabled}
            onClick={() => {
              if (focusedNode == null) {
                instance.uiActions.onFocusNode(selectedNode);
              } else {
                instance.uiActions.onFocusNode();
              }
            }}
            icon={
              focusedNode == null ? (
                <FullscreenExitOutlined
                  style={{
                    color: theme.black,
                  }}
                />
              ) : (
                <FullscreenOutlined
                  style={{
                    color: theme.primaryColor,
                  }}
                />
              )
            }
          />
        </Tooltip>
      </Layout.Horizontal>
    </Layout.Right>
  );
}
