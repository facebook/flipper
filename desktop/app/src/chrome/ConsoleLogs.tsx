/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo} from 'react';
import {Button, Toolbar, ButtonGroup, Layout} from '../ui';
import React from 'react';
import {Console, Hook} from 'console-feed';
import type {Methods} from 'console-feed/lib/definitions/Methods';
import {createState, useValue} from 'flipper-plugin';
import {useLocalStorage} from '../utils/useLocalStorage';

const logsAtom = createState<any[]>([]);
export const errorCounterAtom = createState(0);

export function enableConsoleHook() {
  console.log('enabling hooks');
  Hook(
    window.console,
    (log) => {
      logsAtom.set([...logsAtom.get(), log]);
      if (log.method === 'error' || log.method === 'assert') {
        errorCounterAtom.set(errorCounterAtom.get() + 1);
      }
    },
    false,
  );
}

function clearLogs() {
  logsAtom.set([]);
  errorCounterAtom.set(0);
}

const allLogLevels: Methods[] = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'table',
  'clear',
  'time',
  'timeEnd',
  'count',
  'assert',
];

const defaultLogLevels: Methods[] = ['warn', 'error', 'table', 'assert'];

export function ConsoleLogs() {
  const logs = useValue(logsAtom);
  const [logLevels, setLogLevels] = useLocalStorage<Methods[]>(
    'console-logs-loglevels',
    defaultLogLevels,
  );

  const dropdown = useMemo(() => {
    return allLogLevels.map(
      (l): Electron.MenuItemConstructorOptions => ({
        label: l,
        checked: logLevels.includes(l),
        type: 'checkbox',
        click() {
          setLogLevels((state) =>
            state.includes(l)
              ? state.filter((level) => level !== l)
              : [l, ...state],
          );
        },
      }),
    );
  }, [logLevels]);

  return (
    <Layout.Top scrollable>
      <Toolbar>
        <ButtonGroup>
          <Button onClick={clearLogs} icon="trash">
            Clear Logs
          </Button>
          <Button dropdown={dropdown}>Log Levels</Button>
        </ButtonGroup>
      </Toolbar>
      <Console logs={logs} filter={logLevels} variant="light" />
    </Layout.Top>
  );
}
