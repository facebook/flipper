/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type SectionComponentHierarchy = {|
  type: string,
  children: Array<SectionComponentHierarchy>,
|};

export type AddEventPayload = {|
  id: string,
  reason: string,
  stack_trace: Array<string>,
  surface_key: string,
  event_timestamp: number,
  update_mode: number,
  reentrant_count: number,
  payload: ?Object,
|};

export type UpdateTreeGenerationHierarchyGenerationPayload = {|
  hierarchy_generation_timestamp: number,
  id: string,
  reason: string,
  tree?: Array<{
    didTriggerStateUpdate: boolean,
    identifier: string,
    isDirty: boolean,
    isReused: boolean,
    name: string,
    parent: string | 0,
  }>,
|};

export type UpdateTreeGenerationChangesetGenerationPayload = {|
  timestamp: number,
  tree_generation_id: string,
  identifier: string,
  type: string,
  changeset: {
    inserted_items: {},
    inserted_sections: {},
    moved_items: {},
    removed_sections: [],
    updated_items: {
      [key: string]: {
        context: string,
        model: string,
      },
    },
  },
|};

export type UpdateTreeGenerationChangesetApplicationPayload = {|
  changeset: {
    inserted_items: {},
    inserted_sections: {},
    moved_items: {},
    removed_sections: [],
    updated_items: {
      [key: string]: {
        context: string,
        model: string,
      },
    },
  },
  type: string,
  identifier: string,
  timestamp: number,
  section_component_hierarchy: SectionComponentHierarchy,
  tree_generation_id: string,
  payload: ?Object,
|};

export type TreeGeneration = {|
  ...AddEventPayload,
  ...$Shape<UpdateTreeGenerationHierarchyGenerationPayload>,
  ...$Shape<UpdateTreeGenerationChangesetGenerationPayload>,
  changeSets: Array<UpdateTreeGenerationChangesetApplicationPayload>,
|};
