/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo} from 'react';
import {Button, ButtonGroup, Layout} from '../ui';
import React from 'react';
import {Console, Hook} from 'console-feed';
import type {Methods} from 'console-feed/lib/definitions/Methods';
import type {Styles} from 'console-feed/lib/definitions/Styles';
import {createState, useValue} from 'flipper-plugin';
import {useLocalStorageState} from 'flipper-plugin';
import {theme, Toolbar} from 'flipper-plugin';
import {useIsDarkMode} from '../utils/useIsDarkMode';

const MAX_LOG_ITEMS = 1000;

const logsAtom = createState<any[]>([]);
export const errorCounterAtom = createState(0);

export function enableConsoleHook() {
  Hook(
    window.console,
    (log) => {
      if (log.method === 'debug') {
        return; // See below, skip debug messages which are generated very aggressively by Flipper
      }
      const newLogs = logsAtom.get().slice(-MAX_LOG_ITEMS);
      newLogs.push(log);
      logsAtom.set(newLogs);
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
  // 'debug', We typically don't want to allow users to enable the debug logs, as they are used very intensively by flipper itself,
  // making Flipper / console-feed. For debug level logging, use the Chrome devtools.
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
  const isDarkMode = useIsDarkMode();
  const logs = useValue(logsAtom);
  const [logLevels, setLogLevels] = useLocalStorageState<Methods[]>(
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
  }, [logLevels, setLogLevels]);

  const styles = useMemo(buildTheme, []);

  return (
    <Layout.Top>
      <Toolbar>
        <ButtonGroup>
          <Button onClick={clearLogs} icon="trash">
            Clear Logs
          </Button>
          <Button dropdown={dropdown}>Log Levels</Button>
        </ButtonGroup>
      </Toolbar>
      <Layout.ScrollContainer vertical>
        <Console
          logs={logs}
          filter={logLevels}
          variant={isDarkMode ? 'dark' : 'light'}
          styles={styles}
        />
      </Layout.ScrollContainer>
    </Layout.Top>
  );
}

function buildTheme(): Styles {
  return {
    // See: https://github.com/samdenty/console-feed/blob/master/src/definitions/Styles.d.ts
    BASE_BACKGROUND_COLOR: 'transparent',
    BASE_COLOR: theme.textColorPrimary,
    LOG_COLOR: theme.textColorPrimary,
    LOG_BACKGROUND: 'transparent',
    LOG_INFO_BACKGROUND: 'transparent',
    LOG_COMMAND_BACKGROUND: 'transparent',
    LOG_RESULT_BACKGROUND: 'transparent',
    LOG_WARN_BACKGROUND: theme.warningColor,
    LOG_ERROR_BACKGROUND: theme.errorColor,
    LOG_INFO_COLOR: theme.textColorPrimary,
    LOG_COMMAND_COLOR: theme.textColorSecondary,
    LOG_RESULT_COLOR: theme.textColorSecondary,
    LOG_WARN_COLOR: 'white',
    LOG_ERROR_COLOR: 'white',
    LOG_INFO_BORDER: theme.dividerColor,
    LOG_COMMAND_BORDER: theme.dividerColor,
    LOG_RESULT_BORDER: theme.dividerColor,
    LOG_WARN_BORDER: theme.dividerColor,
    LOG_ERROR_BORDER: theme.dividerColor,
    LOG_BORDER: theme.dividerColor,
  };
}
