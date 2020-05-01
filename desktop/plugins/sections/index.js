/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {
  TreeGeneration,
  AddEventPayload,
  UpdateTreeGenerationHierarchyGenerationPayload,
  UpdateTreeGenerationChangesetGenerationPayload,
  UpdateTreeGenerationChangesetApplicationPayload,
} from './Models.js';

import {FlipperPlugin} from 'flipper';
import React from 'react';
import Tree from './Tree.js';
import StackTrace from './StackTrace.js';
import EventTable from './EventsTable.js';
import DetailsPanel from './DetailsPanel.js';

import {
  Toolbar,
  Glyph,
  Sidebar,
  FlexBox,
  styled,
  Button,
  Spacer,
  colors,
  DetailSidebar,
  SearchInput,
  SearchBox,
  SearchIcon,
} from 'flipper';

const Waiting = styled(FlexBox)((props) => ({
  width: '100%',
  height: '100%',
  flexGrow: 1,
  background: colors.light02,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}));

const InfoText = styled.div((props) => ({
  marginTop: 10,
  marginBottom: 10,
  fontWeight: '500',
  color: colors.light30,
}));

const InfoBox = styled.div((props) => ({
  maxWidth: 400,
  margin: 'auto',
  textAlign: 'center',
}));

type State = {
  focusedChangeSet: ?UpdateTreeGenerationChangesetApplicationPayload,
  userSelectedGenerationId: ?string,
  selectedTreeNode: ?Object,
  searchString: string,
};

type PersistedState = {
  generations: {
    [id: string]: TreeGeneration,
  },
  focusedGenerationId: ?string,
  recording: boolean,
};

export default class extends FlipperPlugin<State, *, PersistedState> {
  static title = 'Sections';
  static id = 'Sections';
  static icon = 'tree';

  static defaultPersistedState = {
    generations: {},
    focusedGenerationId: null,
    recording: true,
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: Object,
  ): $Shape<PersistedState> => {
    if (!persistedState.recording) {
      return persistedState;
    }

    const addEvent = (data: AddEventPayload) => ({
      ...persistedState,
      generations: {
        ...persistedState.generations,
        [data.id]: {
          ...data,
          changeSets: [],
        },
      },
      focusedGenerationId: persistedState.focusedGenerationId || data.id,
    });

    const updateTreeGenerationHierarchyGeneration = (
      data: UpdateTreeGenerationHierarchyGenerationPayload,
    ) => ({
      ...persistedState,
      generations: {
        ...persistedState.generations,
        [data.id]: {
          ...persistedState.generations[data.id],
          ...data,
        },
      },
    });

    const updateTreeGenerationChangeset = (
      data:
        | UpdateTreeGenerationChangesetGenerationPayload
        | UpdateTreeGenerationChangesetApplicationPayload,
    ) => ({
      ...persistedState,
      generations: {
        ...persistedState.generations,
        [data.tree_generation_id]: {
          ...persistedState.generations[data.tree_generation_id],
          changeSets: [
            ...persistedState.generations[data.tree_generation_id].changeSets,
            data,
          ],
        },
      },
    });

    if (method === 'addEvent') {
      return addEvent(payload);
    } else if (method === 'updateTreeGenerationHierarchyGeneration') {
      return updateTreeGenerationHierarchyGeneration(payload);
    } else if (
      method === 'updateTreeGenerationChangesetApplication' ||
      method === 'updateTreeGenerationChangesetGeneration'
    ) {
      return updateTreeGenerationChangeset(payload);
    } else {
      return persistedState;
    }
  };

  state = {
    focusedChangeSet: null,
    userSelectedGenerationId: null,
    selectedTreeNode: null,
    searchString: '',
  };

  onTreeGenerationFocused = (focusedGenerationId: ?string) => {
    this.setState({
      focusedChangeSet: null,
      userSelectedGenerationId: focusedGenerationId,
      selectedTreeNode: null,
    });
  };

  onFocusChangeSet = (
    focusedChangeSet: ?UpdateTreeGenerationChangesetApplicationPayload,
  ) => {
    this.setState({
      focusedChangeSet,
      selectedTreeNode: null,
    });
  };

  onNodeClicked = (targetNode: any, evt: InputEvent) => {
    if (targetNode.attributes.isSection) {
      const sectionData = {};
      sectionData['global_key'] = targetNode.attributes.identifier;
      this.setState({
        selectedTreeNode: {sectionData},
      });
      return;
    }

    let dataModel;
    // Not all models can be parsed.
    if (targetNode.attributes.isDataModel) {
      try {
        dataModel = JSON.parse(targetNode.attributes.identifier);
      } catch (e) {
        dataModel = targetNode.attributes.identifier;
      }
    }

    this.setState({
      selectedTreeNode: {dataModel},
    });
  };

  renderTreeHierarchy = (generation: ?TreeGeneration) => {
    if (generation && generation.tree && generation.tree.length > 0) {
      // Display component tree hierarchy, if any
      return (
        <Tree data={generation.tree} nodeClickHandler={this.onNodeClicked} />
      );
    } else if (
      this.state.focusedChangeSet &&
      this.state.focusedChangeSet.section_component_hierarchy
    ) {
      // Display section component hierarchy for specific changeset
      return (
        <Tree
          data={this.state.focusedChangeSet.section_component_hierarchy}
          nodeClickHandler={this.onNodeClicked}
        />
      );
    } else {
      return this.renderWaiting();
    }
  };

  renderWaiting = () => (
    <Waiting>
      <InfoBox>
        <Glyph
          name="face-unhappy"
          variant="outline"
          size={24}
          color={colors.light30}
        />
        <InfoText>No data available...</InfoText>
      </InfoBox>
    </Waiting>
  );

  clear = () => {
    this.props.setPersistedState({
      ...this.constructor.defaultPersistedState,
    });
  };

  onChange = (e: any) => {
    this.setState({searchString: e.target.value});
  };

  generationValues = () => {
    const {generations} = this.props.persistedState;
    const generationKeys = Object.keys(generations);
    return (generationKeys.map(
      (key) => generations[key],
    ): Array<TreeGeneration>);
  };

  matchesCurrentSearchString = (s: string) => {
    return s.toLowerCase().includes(this.state.searchString.toLowerCase());
  };

  matchingGenerationKeys = () => {
    const matchingKeys: Array<string> = this.generationValues()
      .filter((g) => {
        if (g.payload) {
          const componentClassName: ?string = g.payload['component_class_name'];
          if (componentClassName) {
            return this.matchesCurrentSearchString(componentClassName);
          }
        }
        return g.tree?.some((node) => {
          return this.matchesCurrentSearchString(node.name);
        });
      })
      .map((g) => {
        return g.surface_key;
      });

    return new Set<string>(matchingKeys);
  };

  filteredGenerations = () => {
    if (this.state.searchString.length <= 0) {
      return Object.values(this.props.persistedState.generations);
    }

    const matchingKeys = this.matchingGenerationKeys();

    return (this.generationValues().filter((g) => {
      return matchingKeys.has(g.surface_key);
    }): Array<TreeGeneration>);
  };

  render() {
    const {generations} = this.props.persistedState;
    if (Object.values(this.props.persistedState.generations).length === 0) {
      return this.renderWaiting();
    }

    const focusedGenerationId =
      this.state.userSelectedGenerationId ||
      this.props.persistedState.focusedGenerationId;

    const focusedTreeGeneration: ?TreeGeneration = focusedGenerationId
      ? generations[focusedGenerationId]
      : null;

    return (
      <React.Fragment>
        <Toolbar>
          <SearchBox tabIndex={-1}>
            <SearchIcon
              name="magnifying-glass"
              color={colors.macOSTitleBarIcon}
              size={16}
            />
            <SearchInput
              placeholder={'Search'}
              onChange={this.onChange}
              value={this.state.searchString}
            />
          </SearchBox>
          <Spacer />
          {this.props.persistedState.recording ? (
            <Button
              onClick={() =>
                this.props.setPersistedState({
                  recording: false,
                })
              }
              iconVariant="filled"
              icon="stop-playback">
              Stop
            </Button>
          ) : (
            <Button onClick={this.clear} icon="trash" iconVariant="outline">
              Clear
            </Button>
          )}
        </Toolbar>
        <Sidebar position="top" minHeight={80} height={80}>
          <EventTable
            generations={this.filteredGenerations()}
            focusedGenerationId={focusedGenerationId}
            onClick={this.onTreeGenerationFocused}
          />
        </Sidebar>
        {this.renderTreeHierarchy(focusedTreeGeneration)}
        {focusedTreeGeneration && (
          <Sidebar position="bottom" minHeight={100} height={250}>
            <StackTrace
              data={focusedTreeGeneration.stack_trace}
              skip_stack_trace_format={
                focusedTreeGeneration.skip_stack_trace_format
              }
            />
          </Sidebar>
        )}
        <DetailSidebar>
          <DetailsPanel
            eventUserInfo={focusedTreeGeneration?.payload}
            changeSets={focusedTreeGeneration?.changeSets}
            onFocusChangeSet={this.onFocusChangeSet}
            focusedChangeSet={this.state.focusedChangeSet}
            selectedNodeInfo={this.state.selectedTreeNode}
          />
        </DetailSidebar>
      </React.Fragment>
    );
  }
}
