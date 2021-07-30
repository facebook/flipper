/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';

import ContextMenuProvider from './ui/components/ContextMenuProvider';
import GK from './fb-stubs/GK';
import {init as initLogger} from './fb-stubs/Logger';
import {SandyApp} from './sandy-chrome/SandyApp';
import setupPrefetcher from './fb-stubs/Prefetcher';
import {Persistor, persistStore} from 'redux-persist';
import {Store} from './reducers/index';
import dispatcher from './dispatcher/index';
import TooltipProvider from './ui/components/TooltipProvider';
import config from './utils/processConfig';
import {initLauncherHooks} from './utils/launcher';
import {setPersistor} from './utils/persistor';
import React from 'react';
import path from 'path';
import {getStore} from './store';
import {cache} from '@emotion/css';
import {CacheProvider} from '@emotion/react';
import {enableMapSet} from 'immer';
import os from 'os';
import {initializeFlipperLibImplementation} from './utils/flipperLibImplementation';
import {enableConsoleHook} from './chrome/ConsoleLogs';
import {sideEffect} from './utils/sideEffect';
import {
  _NuxManagerContext,
  _createNuxManager,
  _setGlobalInteractionReporter,
  Logger,
  _LoggerContext,
  Layout,
  theme,
  getFlipperLib,
} from 'flipper-plugin';
import isProduction from './utils/isProduction';
import {Button, Input, Result, Typography} from 'antd';
import constants from './fb-stubs/constants';
import styled from '@emotion/styled';
import {CopyOutlined} from '@ant-design/icons';
import {getVersionString} from './utils/versionString';
import {PersistGate} from 'redux-persist/integration/react';
import {ipcRenderer} from 'electron';

if (process.env.NODE_ENV === 'development' && os.platform() === 'darwin') {
  // By default Node.JS has its internal certificate storage and doesn't use
  // the system store. Because of this, it's impossible to access ondemand / devserver
  // which are signed using some internal self-issued FB certificates. These certificates
  // are automatically installed to MacOS system store on FB machines, so here we're using
  // this "mac-ca" library to load them into Node.JS.
  global.electronRequire('mac-ca');
}

enableMapSet();

GK.init();

class AppFrame extends React.Component<
  {logger: Logger; persistor: Persistor},
  {error: any; errorInfo: any}
> {
  state = {error: undefined as any, errorInfo: undefined as any};

  getError() {
    return this.state.error
      ? `${
          this.state.error
        }\n\nFlipper version: ${getVersionString()}\n\nComponent stack:\n${
          this.state.errorInfo?.componentStack
        }\n\nError stacktrace:\n${this.state.error?.stack}`
      : '';
  }

  render() {
    const {logger, persistor} = this.props;
    return this.state.error ? (
      <Layout.Container grow center pad={80} style={{height: '100%'}}>
        <Layout.Top style={{maxWidth: 800, height: '100%'}}>
          <Result
            status="error"
            title="Detected a Flipper crash"
            subTitle={
              <p>
                A crash was detected in the Flipper chrome. Filing a{' '}
                <Typography.Link
                  href={
                    constants.IS_PUBLIC_BUILD
                      ? 'https://github.com/facebook/flipper/issues/new/choose'
                      : constants.FEEDBACK_GROUP_LINK
                  }>
                  bug report
                </Typography.Link>{' '}
                would be appreciated! Please include the details below.
              </p>
            }
            extra={[
              <Button
                key="copy_error"
                icon={<CopyOutlined />}
                onClick={() => {
                  getFlipperLib().writeTextToClipboard(this.getError());
                }}>
                Copy error
              </Button>,
              <Button
                key="retry_error"
                type="primary"
                onClick={() => {
                  this.setState({error: undefined, errorInfo: undefined});
                }}>
                Retry
              </Button>,
            ]}
          />
          <CodeBlock value={this.getError()} readOnly />
        </Layout.Top>
      </Layout.Container>
    ) : (
      <_LoggerContext.Provider value={logger}>
        <Provider store={getStore()}>
          <PersistGate persistor={persistor}>
            <CacheProvider value={cache}>
              <TooltipProvider>
                <ContextMenuProvider>
                  <_NuxManagerContext.Provider value={_createNuxManager()}>
                    <SandyApp />
                  </_NuxManagerContext.Provider>
                </ContextMenuProvider>
              </TooltipProvider>
            </CacheProvider>
          </PersistGate>
        </Provider>
      </_LoggerContext.Provider>
    );
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(
      `Flipper chrome crash: ${error}`,
      error,
      '\nComponents: ' + errorInfo?.componentStack,
    );
    this.setState({
      error,
      errorInfo,
    });
  }
}

function setProcessState(store: Store) {
  const settings = store.getState().settingsState;
  const androidHome = settings.androidHome;
  const idbPath = settings.idbPath;

  if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
    process.env.ANDROID_HOME = androidHome;
  }

  // emulator/emulator is more reliable than tools/emulator, so prefer it if
  // it exists
  process.env.PATH =
    ['emulator', 'tools', 'platform-tools']
      .map((directory) => path.resolve(androidHome, directory))
      .join(':') +
    `:${idbPath}` +
    `:${process.env.PATH}`;

  window.requestIdleCallback(() => {
    setupPrefetcher(settings);
  });
}

function init() {
  const store = getStore();
  const logger = initLogger(store);

  // rehydrate app state before exposing init
  const persistor = persistStore(store, undefined, () => {
    // Make sure process state is set before dispatchers run
    setProcessState(store);
    dispatcher(store, logger);
  });

  setPersistor(persistor);

  initializeFlipperLibImplementation(store, logger);
  _setGlobalInteractionReporter((r) => {
    logger.track('usage', 'interaction', r);
    if (!isProduction()) {
      const msg = `[interaction] ${r.scope}:${r.action} in ${r.duration}ms`;
      if (r.success) console.log(msg);
      else console.warn(msg, r.error);
    }
  });
  ReactDOM.render(
    <AppFrame logger={logger} persistor={persistor} />,
    document.getElementById('root'),
  );
  initLauncherHooks(config(), store);
  enableConsoleHook();
  window.flipperGlobalStoreDispatch = store.dispatch;

  // listen to settings and load the right theme
  sideEffect(
    store,
    {name: 'loadTheme', fireImmediately: false, throttleMs: 500},
    (state) => ({
      dark: state.settingsState.darkMode,
    }),
    (theme) => {
      (
        document.getElementById('flipper-theme-import') as HTMLLinkElement
      ).href = `themes/${theme.dark ? 'dark' : 'light'}.css`;
      ipcRenderer.send('setTheme', theme.dark ? 'dark' : 'light');
    },
  );
}

setImmediate(() => {
  // make sure all modules are loaded
  // @ts-ignore
  window.flipperInit = init;
  window.dispatchEvent(new Event('flipper-store-ready'));
});

const CodeBlock = styled(Input.TextArea)({
  ...theme.monospace,
  color: theme.textColorSecondary,
});
