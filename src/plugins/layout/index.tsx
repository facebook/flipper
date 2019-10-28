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
  MiddlewareAPI,
  PluginClient,
  FlexColumn,
  FlexRow,
  FlipperPlugin,
  Toolbar,
  DetailSidebar,
  VerticalRule,
  Button,
  GK,
  Idler,
  Text,
  styled,
  colors,
  SupportRequestFormManager,
  constants,
} from 'flipper';
import Inspector from './Inspector';
import ToolbarIcon from './ToolbarIcon';
import InspectorSidebar from './InspectorSidebar';
import Search from './Search';
import ProxyArchiveClient from './ProxyArchiveClient';
import React from 'react';

type State = {
  init: boolean;
  inTargetMode: boolean;
  inAXMode: boolean;
  inAlignmentMode: boolean;
  selectedElement: ElementID | null | undefined;
  selectedAXElement: ElementID | null | undefined;
  searchResults: ElementSearchResultSet | null;
};

export type ElementMap = {[key: string]: Element};

export type PersistedState = {
  rootElement: ElementID | null;
  rootAXElement: ElementID | null;
  elements: ElementMap;
  AXelements: ElementMap;
};

const FlipperADBarContainer = styled(FlexRow)({
  backgroundColor: colors.warningTint,
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
});

const FlipperADText = styled(Text)({
  padding: 10,
});

const FlipperADButton = styled(Button)({
  margin: 10,
});

export default class Layout extends FlipperPlugin<State, any, PersistedState> {
  FlipperADBar() {
    return (
      <FlipperADBarContainer>
        <FlipperADText>
          You can now submit support requests to Litho Group from Flipper. This
          automatically attaches critical information for reproducing your issue
          with just a single click.
        </FlipperADText>
        <FlipperADButton
          type="primary"
          onClick={() => {
            this.props.setStaticView(SupportRequestFormManager);
          }}>
          Try it out
        </FlipperADButton>
      </FlipperADBarContainer>
    );
  }

  static exportPersistedState = async (
    callClient: (
      method: 'getAllNodes',
    ) => Promise<{
      allNodes: PersistedState;
    }>,
    persistedState: PersistedState | undefined,
    store: MiddlewareAPI | undefined,
  ): Promise<PersistedState | undefined> => {
    if (!store) {
      return persistedState;
    }
    const {allNodes} = await callClient('getAllNodes');
    return allNodes;
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
  };

  init() {
    if (!this.props.persistedState) {
      // If the selected plugin from the previous session was layout, then while importing the flipper trace, the redux store doesn't get updated in the first render, due to which the plugin crashes, as it has no persisted state
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

    this.setState({
      init: true,
      selectedElement: this.props.deepLinkPayload
        ? this.props.deepLinkPayload
        : null,
    });
  }

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
      ? new ProxyArchiveClient(this.props.persistedState)
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
  showFlipperADBar: boolean = false;
  render() {
    const inspectorProps = {
      client: this.getClient(),
      inAlignmentMode: this.state.inAlignmentMode,
      selectedElement: this.state.selectedElement,
      selectedAXElement: this.state.selectedAXElement,
      setPersistedState: this.props.setPersistedState,
      persistedState: this.props.persistedState,
      onDataValueChanged: this.onDataValueChanged,
      searchResults: this.state.searchResults,
    };

    let element: Element | null = null;
    const {selectedAXElement, selectedElement, inAXMode} = this.state;
    if (inAXMode && selectedAXElement) {
      element = this.props.persistedState.AXelements[selectedAXElement];
    } else if (selectedElement) {
      element = this.props.persistedState.elements[selectedElement];
    }
    if (!constants.IS_PUBLIC_BUILD && !this.showFlipperADBar) {
      this.showFlipperADBar = element != null && element.decoration === 'litho';
    }
    const inspector = (
      <Inspector
        {...inspectorProps}
        onSelect={selectedElement => this.setState({selectedElement})}
        showsSidebar={!this.state.inAXMode}
      />
    );

    const axInspector = this.state.inAXMode && (
      <Inspector
        {...inspectorProps}
        onSelect={selectedAXElement => this.setState({selectedAXElement})}
        showsSidebar={true}
        ax
      />
    );

    const divider = this.state.inAXMode && <VerticalRule />;

    const showAnalyzeYogaPerformanceButton = GK.get('flipper_yogaperformance');

    return (
      <FlexColumn grow={true}>
        {this.state.init && (
          <>
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

              <Search
                client={this.getClient()}
                setPersistedState={this.props.setPersistedState}
                persistedState={this.props.persistedState}
                onSearchResults={searchResults =>
                  this.setState({searchResults})
                }
                inAXMode={this.state.inAXMode}
                initialQuery={this.props.deepLinkPayload}
              />
            </Toolbar>
            <FlexRow grow={true}>
              {inspector}
              {divider}
              {axInspector}
            </FlexRow>
            {this.showFlipperADBar && this.FlipperADBar()}
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
          </>
        )}
      </FlexColumn>
    );
  }
}
