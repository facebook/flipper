/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  TreeGeneration,
  AddEventPayload,
  UpdateTreeGenerationHierarchyGenerationPayload,
  UpdateTreeGenerationChangesetGenerationPayload,
  UpdateTreeGenerationChangesetApplicationPayload,
} from './Models';

import Tree from './Tree';
import StackTrace from './StackTrace';
import EventTable from './EventsTable';
import DetailsPanel from './DetailsPanel';
import React, {useState, useMemo} from 'react';

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
  Layout,
} from 'flipper';

import {FlipperClient, createState, usePlugin, useValue} from 'flipper-plugin';

const Waiting = styled(FlexBox)({
  width: '100%',
  height: '100%',
  flexGrow: 1,
  background: colors.light02,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});

const InfoText = styled.div({
  marginTop: 10,
  marginBottom: 10,
  fontWeight: 500,
  color: colors.light30,
});

const InfoBox = styled.div({
  maxWidth: 400,
  margin: 'auto',
  textAlign: 'center',
});

type Events = {
  addEvent: AddEventPayload;
  updateTreeGenerationHierarchyGeneration: UpdateTreeGenerationHierarchyGenerationPayload;
  updateTreeGenerationChangesetApplication: UpdateTreeGenerationChangesetApplicationPayload;
  updateTreeGenerationChangesetGeneration: UpdateTreeGenerationChangesetGenerationPayload;
};

type FocusInfo = {
  generationId: string;
};

export function plugin(client: FlipperClient<Events, {}>) {
  const generations = createState<{[id: string]: TreeGeneration}>(
    {},
    {persist: 'generations'},
  );
  const focusInfo = createState<FocusInfo | undefined>(undefined);
  const recording = createState<boolean>(true);

  client.onMessage('addEvent', (data) => {
    if (!recording.get()) {
      return;
    }
    generations.update((draft) => {
      draft[data.id] = {...data, changeSets: []};
    });
    focusInfo.set({
      generationId: focusInfo.get()?.generationId || data.id,
    });
  });
  client.onMessage('updateTreeGenerationHierarchyGeneration', (data) => {
    generations.update((draft) => {
      draft[data.id] = {...draft[data.id], ...data};
    });
  });
  function updateTreeGenerationChangeset(
    data:
      | UpdateTreeGenerationChangesetGenerationPayload
      | UpdateTreeGenerationChangesetApplicationPayload,
  ) {
    generations.update((draft) => {
      draft[data.tree_generation_id].changeSets.push(data);
    });
  }
  client.onMessage(
    'updateTreeGenerationChangesetApplication',
    updateTreeGenerationChangeset,
  );
  client.onMessage(
    'updateTreeGenerationChangesetGeneration',
    updateTreeGenerationChangeset,
  );

  function setRecording(value: boolean) {
    recording.set(value);
  }
  function clear() {
    generations.set({});
    focusInfo.set(undefined);
    recording.set(true);
  }

  return {
    generations,
    focusInfo,
    recording,
    setRecording,
    clear,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const generations = useValue(instance.generations);
  const focusInfo = useValue(instance.focusInfo);
  const recording = useValue(instance.recording);

  const [userSelectedGenerationId, setUserSelectedGenerationId] = useState<
    string | undefined
  >();
  const [searchString, setSearchString] = useState<string>('');
  const [focusedChangeSet, setFocusedChangeSet] = useState<
    UpdateTreeGenerationChangesetApplicationPayload | null | undefined
  >(null);
  const [selectedTreeNode, setSelectedTreeNode] = useState<any>();

  const focusedTreeGeneration: TreeGeneration | null = useMemo(() => {
    const id = userSelectedGenerationId || focusInfo?.generationId;
    if (id === undefined) {
      return null;
    }
    return generations[id];
  }, [userSelectedGenerationId, focusInfo, generations]);
  const filteredGenerations: Array<TreeGeneration> = useMemo(() => {
    const generationValues = Object.values(generations);
    if (searchString.length <= 0) {
      return generationValues;
    }

    const matchesCurrentSearchString = (s: string): boolean => {
      return s.toLowerCase().includes(searchString.toLowerCase());
    };
    const matchingKeys: Array<string> = generationValues
      .filter((g) => {
        if (g.payload) {
          const componentClassName: string | null | undefined =
            g.payload.component_class_name;
          if (componentClassName) {
            return matchesCurrentSearchString(componentClassName);
          }
        }
        return g.tree?.some((node) => {
          return matchesCurrentSearchString(node.name);
        });
      })
      .map((g) => {
        return g.surface_key;
      });

    return generationValues.filter((g) => matchingKeys.includes(g.surface_key));
  }, [generations, searchString]);

  return (
    <Layout.Right>
      <Layout.Top>
        <Toolbar>
          <SearchBox tabIndex={-1}>
            <SearchIcon
              name="magnifying-glass"
              color={colors.macOSTitleBarIcon}
              size={16}
            />
            <SearchInput
              placeholder={'Search'}
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </SearchBox>
          <Spacer />
          {recording ? (
            <Button
              onClick={() => instance.setRecording(false)}
              iconVariant="filled"
              icon="stop-playback">
              Stop
            </Button>
          ) : (
            <Button onClick={instance.clear} icon="trash" iconVariant="outline">
              Clear
            </Button>
          )}
        </Toolbar>
        <Layout.Top scrollable={false}>
          <Sidebar position="top" minHeight={80} height={80}>
            <EventTable
              generations={filteredGenerations}
              focusedGenerationId={
                userSelectedGenerationId || focusInfo?.generationId
              }
              onClick={(id?: string) => {
                setFocusedChangeSet(null);
                setUserSelectedGenerationId(id);
                setSelectedTreeNode(null);
              }}
            />
          </Sidebar>
          <Layout.Top>
            <Sidebar position="top" minHeight={400} height={400}>
              <TreeHierarchy
                generation={focusedTreeGeneration}
                focusedChangeSet={focusedChangeSet}
                setSelectedTreeNode={setSelectedTreeNode}
              />
            </Sidebar>
            {focusedTreeGeneration && (
              <StackTrace
                data={focusedTreeGeneration.stack_trace}
                skipStackTraceFormat={
                  focusedTreeGeneration.skip_stack_trace_format
                }
              />
            )}
          </Layout.Top>
        </Layout.Top>
      </Layout.Top>
      <DetailSidebar>
        <DetailsPanel
          eventUserInfo={focusedTreeGeneration?.payload}
          changeSets={focusedTreeGeneration?.changeSets}
          onFocusChangeSet={(
            focusedChangeSet:
              | UpdateTreeGenerationChangesetApplicationPayload
              | null
              | undefined,
          ) => {
            setFocusedChangeSet(focusedChangeSet);
            setSelectedTreeNode(null);
          }}
          focusedChangeSet={focusedChangeSet}
          selectedNodeInfo={selectedTreeNode}
        />
      </DetailSidebar>
    </Layout.Right>
  );
}

function TreeHierarchy({
  generation,
  focusedChangeSet,
  setSelectedTreeNode,
}: {
  generation: TreeGeneration | null;
  focusedChangeSet:
    | UpdateTreeGenerationChangesetApplicationPayload
    | null
    | undefined;
  setSelectedTreeNode: (node: any) => void;
}) {
  const onNodeClicked = useMemo(
    () => (targetNode: any) => {
      if (targetNode.attributes.isSection) {
        const sectionData: any = {};
        sectionData.global_key = targetNode.attributes.identifier;
        setSelectedTreeNode({sectionData});
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

      setSelectedTreeNode({dataModel});
    },
    [setSelectedTreeNode],
  );

  if (generation && generation.tree && generation.tree.length > 0) {
    // Display component tree hierarchy, if any
    return <Tree data={generation.tree} nodeClickHandler={onNodeClicked} />;
  } else if (focusedChangeSet && focusedChangeSet.section_component_hierarchy) {
    // Display section component hierarchy for specific changeset
    return (
      <Tree
        data={focusedChangeSet.section_component_hierarchy}
        nodeClickHandler={onNodeClicked}
      />
    );
  } else {
    return (
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
  }
}
