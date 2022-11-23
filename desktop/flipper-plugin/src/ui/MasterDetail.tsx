/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {
  createElement,
  createRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import {DataInspector} from './data-inspector/DataInspector';
import {DataTable, DataTableProps} from './data-table/DataTable';
import {DataTableManager} from './data-table/DataTableManager';
import {DetailSidebar} from './DetailSidebar';
import {Layout} from './Layout';
import {Panel} from './Panel';

import {
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {Button} from 'antd';
import {usePluginInstance} from '../plugin/PluginContext';
import {Atom, createState} from 'flipper-plugin-core';
import {useAssertStableRef} from '../utils/useAssertStableRef';
import {useValue} from '../state/atom';

type MasterDetailProps<T> = {
  /**
   * Where to display the details of the currently selected record?
   * 'main' (default): show the details in the standard, centrally controlled right sidebar
   * 'right': show a resizable pane to the right
   * 'bottom': show a resizable pane to the bottom
   * 'none': don't show details at all
   */
  sidebarPosition?: 'bottom' | 'right' | 'main' | 'none';
  /**
   * Component that accepts a 'record' prop that is used to render details.
   * If none is provided, a standard `DataInspector` component will be used to display the entire record.
   */
  sidebarComponent?: React.FC<{record: T}>;
  /**
   * Default size of the sidebar.
   */
  sidebarSize?: number;
  /**
   * If provided, this atom will be used to store selection in.
   */
  selection?: Atom<T | undefined>;
  /**
   * If provided, this atom will be used to store pause/resume state in, and a pause/resume toggle will be shown
   */
  isPaused?: Atom<boolean>;
  /**
   * If set, a clear button will be shown.
   * By default this will clear the dataSource (if applicable).
   */
  enableClear?: boolean;
  /**
   * Callback to be called when clear action is used.
   */
  onClear?: () => void;
  /**
   * If provided, standard menu entries will be created for clear, goToBottom and createPaste
   */
  enableMenuEntries?: boolean;
};

export function MasterDetail<T extends object>({
  dataSource,
  records,
  sidebarComponent,
  sidebarPosition,
  sidebarSize,
  onSelect,
  extraActions,
  enableMenuEntries,
  enableClear,
  isPaused,
  selection,
  onClear,
  ...tableProps
}: MasterDetailProps<T> & DataTableProps<T>) {
  useAssertStableRef(isPaused, 'isPaused');
  useAssertStableRef(selection, 'selection');

  const pluginInstance = usePluginInstance();
  const {client} = pluginInstance;
  const connected = useValue(pluginInstance.client.connected);

  const selectionAtom =
    // if no selection atom is provided, the component is uncontrolled
    // and we maintain our own selection atom
    // eslint-disable-next-line
    selection ?? useState(() => createState<T | undefined>(undefined))[0];
  const selectedRecord = useValue(selectionAtom);

  // if a tableManagerRef is provided, we piggy back on that same ref
  // eslint-disable-next-line
  const tableManagerRef =
    tableProps.tableManagerRef ?? createRef<undefined | DataTableManager<T>>();

  const pausedState = useValue(isPaused, false);

  const sidebar =
    sidebarPosition !== 'none' && selectedRecord && sidebarComponent
      ? createElement(sidebarComponent, {
          record: selectedRecord,
        })
      : null;

  const handleSelect = useCallback(
    (record: T | undefined, records: T[]) => {
      selectionAtom.set(record);
      onSelect?.(record, records);
    },
    [selectionAtom, onSelect],
  );

  const handleTogglePause = useCallback(() => {
    isPaused?.set(!isPaused?.get());
  }, [isPaused]);

  const handleClear = useCallback(() => {
    handleSelect(undefined, []);
    if (dataSource) {
      dataSource.clear();
      onClear?.();
    } else {
      if (!onClear) {
        throw new Error(
          "onClear must be set when using 'enableClear' and 'records'",
        );
      }
      onClear();
    }
  }, [dataSource, onClear, handleSelect]);

  const handleCreatePaste = useCallback(() => {
    const selection = tableManagerRef.current?.getSelectedItems();
    switch (selection?.length) {
      case undefined:
      case 0:
        return;
      case 1:
        client.createPaste(JSON.stringify(selection[0], null, 2));
        break;
      default:
        client.createPaste(JSON.stringify(selection, null, 2));
    }
  }, [client, tableManagerRef]);

  const handleGoToBottom = useCallback(() => {
    const size = dataSource ? dataSource.view.size : records!.length;
    tableManagerRef?.current?.selectItem(size - 1);
  }, [dataSource, records, tableManagerRef]);

  useEffect(
    function setupMenuEntries() {
      if (enableMenuEntries) {
        if (enableClear) {
          client.addMenuEntry({
            action: 'clear',
            handler: handleClear,
          });
        }
        if (client.isFB) {
          client.addMenuEntry({
            action: 'createPaste',
            handler: handleCreatePaste,
          });
        }
        client.addMenuEntry({
          action: 'goToBottom',
          handler: handleGoToBottom,
        });
      }
    },
    [
      client,
      enableClear,
      enableMenuEntries,
      handleClear,
      handleCreatePaste,
      handleGoToBottom,
    ],
  );

  const table = (
    <DataTable<T>
      enableAutoScroll
      {...tableProps}
      dataSource={dataSource as any}
      records={records!}
      tableManagerRef={tableManagerRef}
      onSelect={handleSelect}
      extraActions={
        <>
          {connected && isPaused && (
            <Button
              title={`Click to ${pausedState ? 'resume' : 'pause'} the stream`}
              danger={pausedState}
              onClick={handleTogglePause}>
              {pausedState ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            </Button>
          )}
          {connected && enableClear && (
            <Button title="Clear records" onClick={handleClear}>
              <DeleteOutlined />
            </Button>
          )}
          {extraActions}
        </>
      }
    />
  );

  switch (sidebarPosition!) {
    case 'main':
      return (
        <Layout.Container grow>
          {table}
          <DetailSidebar width={sidebarSize}>{sidebar}</DetailSidebar>
        </Layout.Container>
      );
    case 'right':
      return (
        <Layout.Right resizable width={sidebarSize}>
          {table}
          {sidebar}
        </Layout.Right>
      );
    case 'bottom':
      return (
        <Layout.Bottom resizable height={sidebarSize}>
          {table}
          {sidebar}
        </Layout.Bottom>
      );
    case 'none':
      return table;
  }
}

MasterDetail.defaultProps = {
  sidebarPosition: 'main',
  sidebarSize: 400,
  sidebarComponent: DefaultRenderSidebar,
} as Partial<MasterDetailProps<any>>;

function DefaultRenderSidebar<T>({record}: {record: T}) {
  return (
    <Panel title="Payload" collapsible={false} pad>
      <DataInspector data={record} expandRoot />
    </Panel>
  );
}
