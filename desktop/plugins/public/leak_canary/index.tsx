/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  Panel,
  FlexRow,
  ElementsInspector,
  FlexColumn,
  ManagedDataInspector,
  Sidebar,
  Toolbar,
  Checkbox,
  FlipperPlugin,
  Button,
  styled,
  DataDescriptionType,
} from 'flipper';
import {Element} from 'flipper';
import {processLeaks} from './processLeakString';

type State = {
  leaks: Leak[];
  selectedIdx: number | null;
  selectedEid: string | null;
  showFullClassPaths: boolean;
  leaksCount: number;
};

type LeakReport = {
  leaks: string[];
};

type LeakCanary2Report = {
  leaks: Leak2[];
};

export type Fields = {[key: string]: string};
export type Leak = {
  title: string;
  root: string;
  elements: {[key: string]: Element};
  elementsSimple: {[key: string]: Element};
  instanceFields: {[key: string]: Fields};
  staticFields: {[key: string]: Fields};
  retainedSize: string;
  details?: string;
};

export type Leak2 = {
  title: string;
  root: string;
  elements: {[key: string]: Element};
  retainedSize: string;
  details: string;
};

const Window = styled(FlexRow)({
  height: '100%',
  flex: 1,
});

const ToolbarItem = styled(FlexRow)({
  alignItems: 'center',
  marginLeft: '8px',
});

export default class LeakCanary<PersistedState> extends FlipperPlugin<
  State,
  {type: 'LeakCanary'},
  PersistedState
> {
  state: State = {
    leaks: [],
    selectedIdx: null,
    selectedEid: null,
    showFullClassPaths: false,
    leaksCount: 0,
  };

  init() {
    this.client.subscribe('reportLeak', (results: LeakReport) => {
      this._addNewLeaks(processLeaks(results.leaks));
    });

    this.client.subscribe('reportLeak2', (results: LeakCanary2Report) => {
      this._addNewLeaks(results.leaks.map(this._adaptLeak2));
    });
  }

  _addNewLeaks = (incomingLeaks: Leak[]) => {
    // We only process new leaks instead of replacing the whole list in order
    // to both avoid redundant processing and to preserve the expanded/
    // collapsed state of the tree view
    const newLeaks = incomingLeaks.slice(this.state.leaksCount);
    const leaks = this.state.leaks;
    for (let i = 0; i < newLeaks.length; i++) {
      leaks.push(newLeaks[i]);
    }

    this.setState({
      leaks: leaks,
      leaksCount: leaks.length,
    });
  };

  _adaptLeak2 = (leak: Leak2): Leak => {
    return {
      title: leak.title,
      root: leak.root,
      elements: leak.elements,
      elementsSimple: leak.elements,
      staticFields: {},
      instanceFields: {},
      retainedSize: leak.retainedSize,
      details: leak.details,
    };
  };

  _clearLeaks = () => {
    this.setState({
      leaks: [],
      leaksCount: 0,
      selectedIdx: null,
      selectedEid: null,
    });
    this.client.call('clear');
  };

  _selectElement = (leakIdx: number, eid: string) => {
    this.setState({
      selectedIdx: leakIdx,
      selectedEid: eid,
    });
  };

  _toggleElement = (leakIdx: number, eid: string) => {
    const {leaks} = this.state;
    const leak = leaks[leakIdx];

    const element = leak.elements[eid];
    const elementSimple = leak.elementsSimple[eid];
    if (!element || !elementSimple) {
      return;
    }
    element.expanded = !element.expanded;
    elementSimple.expanded = !elementSimple.expanded;

    this.setState({
      leaks: leaks,
    });
  };

  /**
   * Given a specific string value, determines what DataInspector type to treat
   * it as. Ensures that numbers, bools, etc render correctly.
   */
  _extractValue(
    value: any,
    _: number, // depth
  ): {mutable: boolean; type: DataDescriptionType; value: any} {
    if (!isNaN(value)) {
      return {mutable: false, type: 'number', value: value};
    } else if (value == 'true' || value == 'false') {
      return {mutable: false, type: 'boolean', value: value};
    } else if (value == 'null') {
      return {mutable: false, type: 'null', value: value};
    }
    return {mutable: false, type: 'enum', value: value};
  }

  renderSidebar() {
    const {selectedIdx, selectedEid, leaks} = this.state;

    if (selectedIdx == null || selectedEid == null) {
      return null;
    }

    const leak = leaks[selectedIdx];
    const staticFields = leak.staticFields[selectedEid];
    const instanceFields = leak.instanceFields[selectedEid];

    return (
      <Sidebar position="right" width={600} minWidth={300} maxWidth={900}>
        {instanceFields && (
          <Panel heading={'Instance'} floating={false} grow={false}>
            <ManagedDataInspector
              data={instanceFields}
              expandRoot={true}
              extractValue={this._extractValue}
            />
          </Panel>
        )}
        {staticFields && (
          <Panel heading={'Static'} floating={false} grow={false}>
            <ManagedDataInspector
              data={staticFields}
              expandRoot={true}
              extractValue={this._extractValue}
            />
          </Panel>
        )}
        {leak.details && (
          <Panel heading={'Details'} floating={false} grow={false}>
            <pre>{leak.details}</pre>
          </Panel>
        )}
      </Sidebar>
    );
  }

  render() {
    const {selectedIdx, selectedEid, showFullClassPaths} = this.state;
    const sidebar = this.renderSidebar();

    return (
      <Window>
        <FlexColumn grow={true}>
          <FlexColumn grow={true} scrollable={true}>
            {this.state.leaks.map((leak: Leak, idx: number) => {
              const elements = showFullClassPaths
                ? leak.elements
                : leak.elementsSimple;

              const selected = selectedIdx == idx ? selectedEid : null;
              return (
                <Panel
                  key={idx}
                  collapsable={false}
                  padded={false}
                  heading={leak.title}
                  floating={false}
                  accessory={leak.retainedSize}>
                  <ElementsInspector
                    onElementSelected={(eid) => {
                      this._selectElement(idx, eid);
                    }}
                    onElementHovered={() => {}}
                    onElementExpanded={(eid /*, deep*/) => {
                      this._toggleElement(idx, eid);
                    }}
                    selected={selected}
                    searchResults={null}
                    root={leak.root}
                    elements={elements}
                  />
                </Panel>
              );
            })}
          </FlexColumn>
          <Toolbar>
            <ToolbarItem>
              <Button onClick={this._clearLeaks}>Clear</Button>
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                checked={showFullClassPaths}
                onChange={(checked: boolean) => {
                  this.setState({showFullClassPaths: checked});
                }}
              />
              Show full class path
            </ToolbarItem>
          </Toolbar>
        </FlexColumn>
        {sidebar}
      </Window>
    );
  }
}
