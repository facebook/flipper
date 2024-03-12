/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Provider} from 'react-redux';
import {init as initLogger} from './fb-stubs/LoggerEnhanced';
import {SandyApp} from './sandy-chrome/SandyApp';
import {Persistor, persistStore} from 'redux-persist';
import dispatcher from './dispatcher/index';
import TooltipProvider from './ui/components/TooltipProvider';
import {setPersistor} from './utils/persistor';
import React from 'react';
import {getStore} from './store';
import {cache} from '@emotion/css';
import {CacheProvider} from '@emotion/react';
import {initializeFlipperLibImplementation} from './utils/flipperLibImplementation';
import {enableConsoleHook} from './chrome/ConsoleLogs';
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
import {setLoggerInstance, FlipperServer, initLogTailer} from 'flipper-common';
import {startGlobalErrorHandling} from './utils/globalErrorHandling';
import {loadTheme} from './utils/loadTheme';
import {connectFlipperServerToStore} from './dispatcher/flipperServer';
import {enableConnectivityHook} from './chrome/ConnectivityLogs';
import ReactDOM from 'react-dom';
import {uiPerfTracker} from './utils/UIPerfTracker';
import {getFlipperServerConfig} from './flipperServer';

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
                <_NuxManagerContext.Provider value={_createNuxManager()}>
                  <SandyApp />
                </_NuxManagerContext.Provider>
              </TooltipProvider>
            </CacheProvider>
          </PersistGate>
        </Provider>
      </_LoggerContext.Provider>
    );
  }

  componentDidMount(): void {
    uiPerfTracker.track('ui-perf-root-rendered');
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(
      `Flipper chrome crash: ${error}`,
      error,
      `\nComponents: ${errorInfo?.componentStack}`,
    );
    this.setState({
      error,
      errorInfo,
    });
  }
}

export function startFlipperDesktop(flipperServer: FlipperServer) {
  const settings = getFlipperServerConfig().settings;
  const store = getStore();

  initLogTailer();

  const logger = initLogger(store);
  uiPerfTracker._init();

  setLoggerInstance(logger);
  startGlobalErrorHandling();
  loadTheme(settings.darkMode);

  // rehydrate app state before exposing init
  const persistor = persistStore(store, undefined, async () => {
    // Make sure process state is set before dispatchers run
    await dispatcher(store, logger);
    window.dispatchEvent(new CustomEvent('storeRehydrated'));
    uiPerfTracker.track('ui-perf-store-rehydrated');
    // We could potentially merge ui-perf-store-rehydrated and ui-perf-everything-finally-loaded-jeeeez,
    // but what if at some point in the future we relalize that store rehydration is not actually the last event?
    // Keep it separate for the time being (evil laugh as there is nothing more permanent than temporary stuff)
    uiPerfTracker.track('ui-perf-everything-finally-loaded-jeeeez', {
      numberOfPlugins:
        store.getState().plugins.clientPlugins.size +
        store.getState().plugins.devicePlugins.size,
    });
  });

  setPersistor(persistor);

  initializeFlipperLibImplementation(store, logger);
  _setGlobalInteractionReporter((r) => {
    logger.track('usage', 'interaction', r);
    if (!isProduction()) {
      const msg = `[interaction] ${r.scope}:${r.action} in ${r.duration}ms`;
      if (r.success) console.debug(msg);
      else console.warn(msg, r.error);
    }
  });

  connectFlipperServerToStore(flipperServer, store, logger);

  enableConsoleHook();
  enableConnectivityHook(flipperServer);

  Notification.requestPermission();

  // TODO T116224873: Return the following code back instead of ReactDOM.react when the following issue is fixed: https://github.com/react-component/trigger/issues/288
  // const root = createRoot(document.getElementById('root')!);
  // root.render(<AppFrame logger={logger} persistor={persistor} />);

  const root = document.getElementById('root');
  if (root) {
    ReactDOM.render(<AppFrame logger={logger} persistor={persistor} />, root);
  }

  const launcherMessage = getFlipperServerConfig().processConfig.launcherMsg;
  if (launcherMessage) {
    store.dispatch({
      type: 'LAUNCHER_MSG',
      payload: {
        severity: 'warning',
        message: launcherMessage,
      },
    });
  }
}

const CodeBlock = styled(Input.TextArea)({
  ...theme.monospace,
  color: theme.textColorSecondary,
});
