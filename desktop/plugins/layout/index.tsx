/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ElementID,
  Element,
  ElementSearchResultSet,
  PluginClient,
  FlipperPlugin,
  Toolbar,
  DetailSidebar,
  Button,
  GK,
  Idler,
  ReduxState,
  ArchivedDevice,
  ToolbarIcon,
  Layout,
  Sidebar,
} from 'flipper';
import Inspector from './Inspector';
import InspectorSidebar from './InspectorSidebar';
import Search from './Search';
import ProxyArchiveClient from './ProxyArchiveClient';
import React from 'react';
import {
  VisualizerPortal,
  getFlipperMediaCDN,
  IDEFileResolver,
  IDEType,
} from 'flipper';

type State = {
  init: boolean;
  inTargetMode: boolean;
  inAXMode: boolean;
  inAlignmentMode: boolean;
  selectedElement: ElementID | null | undefined;
  selectedAXElement: ElementID | null | undefined;
  highlightedElement: ElementID | null;
  searchResults: ElementSearchResultSet | null;
  visualizerWindow: Window | null;
  visualizerScreenshot: string | null;
  screenDimensions: {width: number; height: number} | null;
};

export type ElementMap = {[key: string]: Element};

export type PersistedState = {
  rootElement: ElementID | null;
  rootAXElement: ElementID | null;
  elements: ElementMap;
  AXelements: ElementMap;
};
type ClientGetNodesCalls = 'getNodes' | 'getAXNodes';
type ClientMethodCalls = 'getRoot' | 'getAXRoot' | ClientGetNodesCalls;

type ClassFileParams = {
  fileName: string;
  className: string;
  dirRoot: string;
  repo: string;
  lineNumber: number;
  ide: IDEType;
};

export default class LayoutPlugin extends FlipperPlugin<
  State,
  any,
  PersistedState
> {
  static exportPersistedState = async (
    callClient: (method: ClientMethodCalls, params?: any) => Promise<any>,
    persistedState: PersistedState | undefined,
    store: ReduxState | undefined,
    _idler?: Idler | undefined,
    statusUpdate?: (msg: string) => void,
    supportsMethod?: (method: ClientMethodCalls) => Promise<boolean>,
  ): Promise<PersistedState | undefined> => {
    if (!store) {
      return persistedState;
    }
    statusUpdate && statusUpdate('Fetching Root Node...');
    // We need not check the if the client supports `getRoot` as if it should and if it doesn't we will get a suppressed notification in Flipper and things will still export, but we will get an error surfaced.
    const rootElement: Element | null = await callClient('getRoot');
    const rootAXElement: Element | null =
      supportsMethod && (await supportsMethod('getAXRoot')) // getAXRoot only relevant for Android
        ? await callClient('getAXRoot')
        : null;
    const elements: ElementMap = {};

    if (rootElement) {
      statusUpdate && statusUpdate('Fetching Child Nodes...');
      await LayoutPlugin.getAllNodes(
        rootElement,
        elements,
        callClient,
        'getNodes',
        supportsMethod,
      );
    }
    const AXelements: ElementMap = {};
    if (rootAXElement) {
      statusUpdate && statusUpdate('Fetching Child AX Nodes...');
      await LayoutPlugin.getAllNodes(
        rootAXElement,
        AXelements,
        callClient,
        'getAXNodes',
        supportsMethod,
      );
    }
    statusUpdate && statusUpdate('Finished Fetching Child Nodes...');
    return {
      rootElement: rootElement != undefined ? rootElement.id : null,
      rootAXElement: rootAXElement != undefined ? rootAXElement.id : null,
      elements,
      AXelements,
    };
  };

  static getAllNodes = async (
    root: Element,
    nodeMap: ElementMap,
    callClient: (method: ClientGetNodesCalls, params?: any) => Promise<any>,
    method: ClientGetNodesCalls,
    supportsMethod?: (method: ClientGetNodesCalls) => Promise<boolean>,
  ): Promise<void> => {
    nodeMap[root.id] = root;
    if (
      root.children.length > 0 &&
      supportsMethod &&
      (await supportsMethod(method))
    ) {
      await callClient(method, {ids: root.children}).then(
        async ({elements}: {elements: Array<Element>}) => {
          await Promise.all(
            elements.map(async (elem) => {
              await LayoutPlugin.getAllNodes(
                elem,
                nodeMap,
                callClient,
                method,
                supportsMethod,
              );
            }),
          );
        },
      );
    }
  };

  static serializePersistedState: (
    persistedState: PersistedState,
    statusUpdate?: (msg: string) => void,
    idler?: Idler,
  ) => Promise<string> = (
    persistedState: PersistedState,
    statusUpdate?: (msg: string) => void,
    _idler?: Idler,
  ) => {
    statusUpdate && statusUpdate('Serializing Inspector Plugin...');
    return Promise.resolve(JSON.stringify(persistedState));
  };

  static deserializePersistedState: (
    serializedString: string,
  ) => PersistedState = (serializedString: string) => {
    return JSON.parse(serializedString);
  };

  teardown() {
    this.state.visualizerWindow?.close();
  }

  static defaultPersistedState = {
    rootElement: null,
    rootAXElement: null,
    elements: {},
    AXelements: {},
  };

  state: State = {
    init: false,
    inTargetMode: false,
    inAXMode: false,
    inAlignmentMode: false,
    selectedElement: null,
    selectedAXElement: null,
    searchResults: null,
    visualizerWindow: null,
    highlightedElement: null,
    visualizerScreenshot: null,
    screenDimensions: null,
  };

  init() {
    if (!this.props.persistedState) {
      // If the selected plugin from the previous session was layout, then while importing the flipper export, the redux store doesn't get updated in the first render, due to which the plugin crashes, as it has no persisted state
      this.props.setPersistedState(this.constructor.defaultPersistedState);
    }
    // persist searchActive state when moving between plugins to prevent multiple
    // TouchOverlayViews since we can't edit the view heirarchy in onDisconnect
    this.client.call('isSearchActive').then(({isSearchActive}) => {
      this.setState({inTargetMode: isSearchActive});
    });

    // disable target mode after
    this.client.subscribe('select', () => {
      if (this.state.inTargetMode) {
        this.onToggleTargetMode();
      }
    });

    this.client.subscribe('openInIDE', (params: ClassFileParams) => {
      this.openInIDE(params);
    });

    if (this.props.isArchivedDevice) {
      this.getDevice()
        .then((d) => {
          const handle = (d as ArchivedDevice).getArchivedScreenshotHandle();
          if (!handle) {
            throw new Error('No screenshot attached.');
          }
          return handle;
        })
        .then((handle) => getFlipperMediaCDN(handle, 'Image'))
        .then((url) => this.setState({visualizerScreenshot: url}))
        .catch((_) => {
          // Not all exports have screenshots. This is ok.
        });
    }

    this.setState({
      init: true,
      selectedElement:
        typeof this.props.deepLinkPayload === 'string'
          ? this.props.deepLinkPayload
          : null,
    });
  }

  openInIDE = async (params: ClassFileParams) => {
    const paths = await IDEFileResolver.resolveFullPathsFromMyles(
      params.fileName,
      params.dirRoot,
    );
    const selectedPath = IDEFileResolver.getBestPath(paths, params.className);
    let ide: IDEType = Number(IDEType[params.ide]);
    if (Number.isNaN(ide)) {
      ide = IDEType.AS; // default value
    }
    IDEFileResolver.openInIDE(
      selectedPath,
      ide,
      params.repo,
      params.lineNumber,
    );
  };

  onToggleTargetMode = () => {
    const inTargetMode = !this.state.inTargetMode;
    this.setState({inTargetMode});
    this.client.send('setSearchActive', {active: inTargetMode});
  };

  onToggleAXMode = () => {
    this.setState({inAXMode: !this.state.inAXMode});
  };

  getClient(): PluginClient {
    return this.props.isArchivedDevice
      ? new ProxyArchiveClient(this.props.persistedState, (id: string) => {
          this.setState({highlightedElement: id});
        })
      : this.client;
  }
  onToggleAlignmentMode = () => {
    if (this.state.selectedElement) {
      this.client.send('setHighlighted', {
        id: this.state.selectedElement,
        inAlignmentMode: !this.state.inAlignmentMode,
      });
    }
    this.setState({inAlignmentMode: !this.state.inAlignmentMode});
  };

  onToggleVisualizer = () => {
    if (this.state.visualizerWindow) {
      this.state.visualizerWindow.close();
    } else {
      const screenDimensions = this.state.screenDimensions;
      if (!screenDimensions) {
        return;
      }
      const visualizerWindow = window.open(
        '',
        'visualizer',
        `width=${screenDimensions.width},height=${screenDimensions.height}`,
      );
      if (!visualizerWindow) {
        return;
      }
      visualizerWindow.onunload = () => {
        this.setState({visualizerWindow: null});
      };
      visualizerWindow.onresize = () => {
        this.setState({visualizerWindow: visualizerWindow});
      };
      visualizerWindow.onload = () => {
        this.setState({visualizerWindow: visualizerWindow});
      };
    }
  };

  onDataValueChanged = (path: Array<string>, value: any) => {
    const id = this.state.inAXMode
      ? this.state.selectedAXElement
      : this.state.selectedElement;
    this.client.call('setData', {
      id,
      path,
      value,
      ax: this.state.inAXMode,
    });
  };

  getScreenDimensions(): {width: number; height: number} | null {
    if (this.state.screenDimensions) {
      return this.state.screenDimensions;
    }

    requestIdleCallback(() => {
      // Walk the layout tree from root node down until a node with width and height is found.
      // Assume these are the dimensions of the screen.
      let elementId = this.props.persistedState.rootElement;
      while (elementId != null) {
        const element = this.props.persistedState.elements[elementId];
        if (!element) {
          return null;
        }
        if (element.data.View?.width) {
          break;
        }
        elementId = element.children[0];
      }
      if (elementId == null) {
        return null;
      }
      const element = this.props.persistedState.elements[elementId];
      if (
        element == null ||
        typeof element.data.View?.width != 'object' ||
        typeof element.data.View?.height != 'object'
      ) {
        return null;
      }
      const screenDimensions = {
        width: element.data.View?.width.value,
        height: element.data.View?.height.value,
      };
      this.setState({screenDimensions});
    });

    return null;
  }

  render() {
    const inspectorProps = {
      client: this.getClient(),
      inAlignmentMode: this.state.inAlignmentMode,
      selectedElement: this.state.selectedElement,
      selectedAXElement: this.state.selectedAXElement,
      setPersistedState: this.props.setPersistedState,
      persistedState: this.props.persistedState,
      searchResults: this.state.searchResults,
    };

    let element: Element | null = null;
    const {selectedAXElement, selectedElement, inAXMode} = this.state;
    if (inAXMode && selectedAXElement) {
      element = this.props.persistedState.AXelements[selectedAXElement];
    } else if (selectedElement) {
      element = this.props.persistedState.elements[selectedElement];
    }

    const inspector = (
      <Inspector
        {...inspectorProps}
        onSelect={(selectedElement) => this.setState({selectedElement})}
        showsSidebar={!this.state.inAXMode}
      />
    );

    const axInspector = this.state.inAXMode ? (
      <Sidebar width={400} backgroundColor="white" position="right">
        <Inspector
          {...inspectorProps}
          onSelect={(selectedAXElement) => this.setState({selectedAXElement})}
          showsSidebar={true}
          ax
        />
      </Sidebar>
    ) : null;

    const showAnalyzeYogaPerformanceButton = GK.get('flipper_yogaperformance');

    const screenDimensions = this.getScreenDimensions();

    if (!this.state.init) {
      return null;
    }
    return (
      <>
        <Layout.Top>
          <Toolbar>
            {!this.props.isArchivedDevice && (
              <ToolbarIcon
                onClick={this.onToggleTargetMode}
                title="Toggle target mode"
                icon="target"
                active={this.state.inTargetMode}
              />
            )}
            {this.realClient.query.os === 'Android' && (
              <ToolbarIcon
                onClick={this.onToggleAXMode}
                title="Toggle to see the accessibility hierarchy"
                icon="accessibility"
                active={this.state.inAXMode}
              />
            )}
            {!this.props.isArchivedDevice && (
              <ToolbarIcon
                onClick={this.onToggleAlignmentMode}
                title="Toggle AlignmentMode to show alignment lines"
                icon="borders"
                active={this.state.inAlignmentMode}
              />
            )}
            {this.props.isArchivedDevice && this.state.visualizerScreenshot && (
              <ToolbarIcon
                onClick={this.onToggleVisualizer}
                title="Toggle visual recreation of layout"
                icon="mobile"
                active={!!this.state.visualizerWindow}
              />
            )}

            <Search
              client={this.getClient()}
              setPersistedState={this.props.setPersistedState}
              persistedState={this.props.persistedState}
              onSearchResults={(searchResults) =>
                this.setState({searchResults})
              }
              inAXMode={this.state.inAXMode}
              initialQuery={
                typeof this.props.deepLinkPayload === 'string'
                  ? this.props.deepLinkPayload
                  : null
              }
            />
          </Toolbar>
          <Layout.Right>
            {inspector}
            {axInspector}
          </Layout.Right>
        </Layout.Top>

        <DetailSidebar>
          <InspectorSidebar
            client={this.getClient()}
            realClient={this.realClient}
            element={element}
            onValueChanged={this.onDataValueChanged}
            logger={this.props.logger}
          />
          {showAnalyzeYogaPerformanceButton &&
          element &&
          element.decoration === 'litho' ? (
            <Button
              icon={'share-external'}
              compact={true}
              style={{marginTop: 8, marginRight: 12}}
              onClick={() => {
                this.props.selectPlugin('YogaPerformance', element!.id);
              }}>
              Analyze Yoga Performance
            </Button>
          ) : null}
        </DetailSidebar>
        {this.state.visualizerWindow &&
          screenDimensions &&
          (this.state.visualizerScreenshot ? (
            <VisualizerPortal
              container={this.state.visualizerWindow.document.body}
              elements={this.props.persistedState.elements}
              highlightedElement={this.state.highlightedElement}
              screenshotURL={this.state.visualizerScreenshot}
              screenDimensions={screenDimensions}
            />
          ) : (
            'Loading...'
          ))}
      </>
    );
  }
}
