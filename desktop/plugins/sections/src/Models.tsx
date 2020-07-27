/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type SectionComponentHierarchy = {
  type: string;
  children: Array<SectionComponentHierarchy>;
};

export type AddEventPayload = {
  id: string;
  reason: string;
  stack_trace: Array<string>;
  skip_stack_trace_format?: boolean;
  surface_key: string;
  event_timestamp: number;
  update_mode: number;
  reentrant_count: number;
  payload: any;
};

export type UpdateTreeGenerationHierarchyGenerationPayload = {
  hierarchy_generation_timestamp: number;
  id: string;
  reason: string;
  tree?: Array<{
    didTriggerStateUpdate?: boolean;
    identifier: string;
    isDirty?: boolean;
    isReused?: boolean;
    name: string;
    parent: string | '';
    inserted?: boolean;
    removed?: boolean;
    updated?: boolean;
    unchanged?: boolean;
    isSection?: boolean;
    isDataModel?: boolean;
  }>;
};

export type UpdateTreeGenerationChangesetGenerationPayload = {
  timestamp: number;
  tree_generation_id: string;
  identifier: string;
  type: string;
  changeset: {
    section_key: {
      changesets: {
        id: {
          count: number;
          index: number;
          toIndex?: number;
          type: string;
          render_infos?: Array<String>;
          prev_data?: Array<String>;
          next_data?: Array<String>;
        };
      };
    };
  };
};

export type UpdateTreeGenerationChangesetApplicationPayload = {
  changeset: {
    section_key: {
      changesets: {
        id: {
          count: number;
          index: number;
          toIndex?: number;
          type: string;
          render_infos?: Array<String>;
          prev_data?: Array<String>;
          next_data?: Array<String>;
        };
      };
    };
  };
  type: string;
  identifier: string;
  timestamp: number;
  section_component_hierarchy?: SectionComponentHierarchy;
  tree_generation_id: string;
  payload?: any;
};

export type TreeGeneration = {
  changeSets: Array<UpdateTreeGenerationChangesetApplicationPayload>;
} & AddEventPayload &
  Partial<UpdateTreeGenerationHierarchyGenerationPayload> &
  Partial<UpdateTreeGenerationChangesetGenerationPayload>;
