/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Dropdown, Slider, Tooltip, Typography} from 'antd';
import {Layout, produce, theme, usePlugin, useValue} from 'flipper-plugin';
import {ClientNode, Id} from '../../ClientTypes';
import {plugin} from '../../index';
import React from 'react';
import {
  AimOutlined,
  AlignLeftOutlined,
  BorderOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PicCenterOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {tracker} from '../../utils/tracker';
import {debounce} from 'lodash';
import {
  ReferenceImageAction,
  ReferenceImageState,
  WireFrameMode,
} from '../../DesktopTypes';
import {createDropDownItem} from '../shared/createDropDownItem';
export type TargetModeState =
  | {
      state: 'selected';
      targetedNodes: ClientNode[];
      sliderPosition: number;
    }
  | {
      state: 'active';
    }
  | {
      state: 'disabled';
    };

const wireFrameModeDropDownItems = [
  createDropDownItem<WireFrameMode>('All', 'All'),
  createDropDownItem<WireFrameMode>(
    'SelectedAndChildren',
    'Selected and children',
  ),
  createDropDownItem<WireFrameMode>('SelectedOnly', 'Selected only'),
];

const refernceImageItemsWithOutClear = [
  createDropDownItem<ReferenceImageAction>(
    'Import',
    'Load reference image from disk',
  ),
];

const refernceImageItemsWithClear = [
  createDropDownItem<ReferenceImageAction>(
    'Import',
    'Load reference image from disk',
  ),
  createDropDownItem<ReferenceImageAction>('Clear', 'Clear reference image'),
];

export function VisualiserControls({
  targetMode,
  setTargetMode,
  selectedNode,
  focusedNode,
  wireFrameMode,
  onSetWireFrameMode,
  alignmentModeEnabled,
  setAlignmentModeEnabled,
  boxVisualiserEnabled,
  setBoxVisualiserEnabled,
}: {
  wireFrameMode: WireFrameMode;
  onSetWireFrameMode: (mode: WireFrameMode) => void;
  selectedNode?: ClientNode;
  focusedNode?: Id;
  setTargetMode: (targetMode: TargetModeState) => void;
  targetMode: TargetModeState;
  alignmentModeEnabled: boolean;
  setAlignmentModeEnabled: (enabled: boolean) => void;
  boxVisualiserEnabled: boolean;
  setBoxVisualiserEnabled: (enabled: boolean) => void;
}) {
  const instance = usePlugin(plugin);

  const referenceImage = useValue(instance.uiState.referenceImage);

  const focusDisabled =
    focusedNode == null &&
    (selectedNode == null || selectedNode.children.length === 0);
  const focusToolTip = focusDisabled
    ? 'Select a non leaf node to focus it'
    : focusedNode == null
      ? 'Focus current node'
      : 'Remove focus';

  const targetToolTip =
    targetMode.state === 'disabled' ? 'Target Mode' : 'Exit  target mode';

  const boxModeDisabled = selectedNode?.boxData == null;
  return (
    <Layout.Container padh="large" gap="small" padv="medium">
      <Layout.Right style={{flexGrow: 0}} gap="medium" center>
        <Typography.Text
          strong
          style={{
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}>
          Visualizer
        </Typography.Text>

        <Layout.Horizontal gap="medium" center>
          <Tooltip
            title={
              boxModeDisabled
                ? 'Box visualisation not available for this element type'
                : 'Box model visualisation mode'
            }>
            <Button
              disabled={boxModeDisabled}
              shape="circle"
              onClick={() => {
                tracker.track('box-visualiser-switched', {
                  on: !boxVisualiserEnabled,
                });
                setBoxVisualiserEnabled(!boxVisualiserEnabled);
              }}
              icon={
                <BorderOutlined
                  style={{
                    color:
                      boxVisualiserEnabled && !boxModeDisabled
                        ? theme.primaryColor
                        : theme.black,
                  }}
                />
              }
            />
          </Tooltip>
          <Tooltip title="Alignment mode">
            <Button
              shape="circle"
              onClick={() => {
                tracker.track('alignment-mode-switched', {
                  on: !alignmentModeEnabled,
                });
                setAlignmentModeEnabled(!alignmentModeEnabled);
              }}
              icon={
                <AlignLeftOutlined
                  style={{
                    color: alignmentModeEnabled
                      ? theme.primaryColor
                      : theme.black,
                  }}
                />
              }
            />
          </Tooltip>
          <Dropdown
            menu={{
              selectable: true,
              selectedKeys: [wireFrameMode],
              items: wireFrameModeDropDownItems,
              onSelect: (event) => {
                onSetWireFrameMode(event.selectedKeys[0] as WireFrameMode);
              },
            }}>
            <Tooltip title="Wireframe Mode">
              <Button shape="circle">
                <PicCenterOutlined />
              </Button>
            </Tooltip>
          </Dropdown>
          <Dropdown
            menu={{
              selectable: false,
              items:
                referenceImage == null
                  ? refernceImageItemsWithOutClear
                  : refernceImageItemsWithClear,

              onClick: async (event) => {
                instance.uiActions.onReferenceImageAction(
                  event.key as ReferenceImageAction,
                );
              },
            }}>
            <Tooltip title="Reference image">
              <Button shape="circle">
                <PictureOutlined />
              </Button>
            </Tooltip>
          </Dropdown>
          <Tooltip title={targetToolTip}>
            <Button
              shape="circle"
              onClick={() => {
                if (targetMode.state === 'disabled') {
                  setTargetMode({state: 'active'});
                  tracker.track('target-mode-switched', {on: true});
                } else {
                  setTargetMode({state: 'disabled'});
                  tracker.track('target-mode-switched', {on: false});
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
              shape="circle"
              disabled={focusDisabled}
              onClick={() => {
                if (focusedNode == null) {
                  instance.uiActions.onFocusNode(selectedNode?.id);
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
      <SecondaryControlArea
        referenceImage={referenceImage}
        targetMode={targetMode}
        setTargetMode={setTargetMode}
      />
    </Layout.Container>
  );
}

/**
 * Panel below that shows additional controls when certain functions are active
 */
function SecondaryControlArea({
  targetMode,
  setTargetMode,
  referenceImage,
}: {
  referenceImage: ReferenceImageState | null;
  targetMode: TargetModeState;
  setTargetMode: (state: TargetModeState) => void;
}) {
  const instance = usePlugin(plugin);

  let textContent: string | null = '';
  let additionalContent: React.ReactElement | null = null;

  if (targetMode.state !== 'disabled') {
    textContent =
      targetMode.state === 'active'
        ? 'Target mode: Select overlapping elements'
        : targetMode.targetedNodes.length === 1
          ? 'No overlapping elements detected'
          : 'Pick element';

    if (
      targetMode.state === 'selected' &&
      targetMode.targetedNodes.length > 1
    ) {
      additionalContent = (
        <Slider
          min={0}
          value={targetMode.sliderPosition}
          max={targetMode.targetedNodes.length - 1}
          tooltip={{
            formatter: (number) =>
              number != null ? targetMode.targetedNodes[number].name : '',
          }}
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

            debouncedReportTargetAdjusted();
          }}
        />
      );
    }
  } else if (referenceImage != null) {
    textContent = 'Opacity';
    additionalContent = (
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={referenceImage.opacity}
        onChange={(value) => {
          instance.uiActions.onReferenceImageAction(value);
        }}
      />
    );
  } else {
    return null;
  }

  return (
    <Layout.Horizontal center style={{paddingTop: theme.space.tiny}}>
      <Typography.Text style={{flexGrow: 1}}>{textContent}</Typography.Text>
      <div
        style={{
          flexGrow: 3.5,
        }}>
        {additionalContent}
      </div>
    </Layout.Horizontal>
  );
}

const debouncedReportTargetAdjusted = debounce(() => {
  tracker.track('target-mode-adjusted', {});
}, 500);
