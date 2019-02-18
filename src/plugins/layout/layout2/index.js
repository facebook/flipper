/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ElementID, Element} from 'flipper';

import {
  FlexColumn,
  FlexRow,
  FlipperPlugin,
  Toolbar,
  Sidebar,
  Link,
  Glyph,
} from 'flipper';
import Inspector from './Inspector';
import ToolbarIcon from './ToolbarIcon';

type State = {|
  init: boolean,
  inTargetMode: boolean,
  inAXMode: boolean,
  selectedElement: ?ElementID,
  selectedAXElement: ?ElementID,
|};

export type PersistedState = {|
  rootElement: ?ElementID,
  rootAXElement: ?ElementID,
  elements: {[key: ElementID]: Element},
  AXelements: {[key: ElementID]: Element},
|};

export default class Layout extends FlipperPlugin<State, void, PersistedState> {
  static defaultPersistedState = {
    rootElement: null,
    rootAXElement: null,
    elements: {},
    AXelements: {},
  };

  state = {
    init: false,
    inTargetMode: false,
    inAXMode: false,
    selectedElement: null,
    selectedAXElement: null,
  };

  componentDidMount() {
    this.props.setPersistedState(Layout.defaultPersistedState);
  }

  init() {
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

    this.setState({init: true});
  }

  onToggleTargetMode = () => {
    const inTargetMode = !this.state.inTargetMode;
    this.setState({inTargetMode});
    this.client.send('setSearchActive', {active: inTargetMode});
  };

  onToggleAXMode = () => {
    this.setState({inAXMode: !this.state.inAXMode});
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

  render() {
    const inspectorProps = {
      client: this.client,
      selectedElement: this.state.selectedElement,
      selectedAXElement: this.state.selectedAXElement,
      setPersistedState: this.props.setPersistedState,
      persistedState: this.props.persistedState,
      onDataValueChanged: this.onDataValueChanged,
    };

    return (
      <FlexColumn grow={true}>
        {this.state.init && (
          <>
            <Toolbar>
              <ToolbarIcon
                onClick={this.onToggleTargetMode}
                title="Toggle target mode"
                icon="target"
                active={this.state.inTargetMode}
              />
              {this.realClient.query.os === 'Android' && (
                <ToolbarIcon
                  onClick={this.onToggleAXMode}
                  title="Toggle to see the accessibility hierarchy"
                  icon="accessibility"
                  active={this.state.inAXMode}
                />
              )}
            </Toolbar>

            <FlexRow grow={true}>
              <Inspector
                {...inspectorProps}
                onSelect={selectedElement => this.setState({selectedElement})}
                showsSidebar={!this.state.inAXMode}
              />
              {this.state.inAXMode && (
                <Sidebar position="right" width={400}>
                  <Inspector
                    {...inspectorProps}
                    onSelect={selectedAXElement =>
                      this.setState({selectedAXElement})
                    }
                    showsSidebar={true}
                    ax
                  />
                </Sidebar>
              )}
            </FlexRow>
          </>
        )}
        <Toolbar position="bottom" compact>
          <Glyph name="beta" color="#8157C7" />&nbsp;
          <strong>Version 2.0:</strong>&nbsp; Provide feedback about this plugin
          in our&nbsp;
          <Link href="https://fb.workplace.com/groups/246035322947653/">
            feedback group
          </Link>.
        </Toolbar>
      </FlexColumn>
    );
  }
}
