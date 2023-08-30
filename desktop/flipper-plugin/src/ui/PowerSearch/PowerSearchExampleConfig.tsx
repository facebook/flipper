/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {OperatorConfig, PowerSearchConfig} from './PowerSearchTypes';

const MyStatusEnum = {
  NEEDS_REVIEW: 'Needs review',
  NEEDS_REVISION: 'Waiting for author',
  ACCEPTED: 'Accepted',
  CLOSED: 'Closed',
  ABANDONED: 'Abandoned',
  CHANGES_PLANNED: 'Changes planned',
  IN_PREPARATION: 'Unpublished',
};

const MyMacroEnum = {
  SURE_WHY_NOT: 'surewhynot',
  DOGSCIENCE: 'dogscience',
  TEST_IN_PROD: 'testinproduction',
  '': '',
};

const operators = {
  in: {
    label: 'is any of',
    key: 'in',
    valueType: 'STRING_SET',
  },
  not_in: {
    label: 'is none of',
    key: 'not_in',
    valueType: 'STRING_SET',
  },
  contain: {
    label: 'contains',
    key: 'contain',
    valueType: 'STRING',
  },
  not_contain: {
    label: 'does not contain',
    key: 'not_contain',
    valueType: 'STRING',
  },
  greater_than: {
    label: '>',
    key: 'greater_than',
    valueType: 'INTEGER',
  },
  greater_than_float: {
    label: '>',
    key: 'greater_than_float',
    valueType: 'FLOAT',
  },
  less_than: {
    label: '<',
    key: 'less_than',
    valueType: 'INTEGER',
  },
  less_than_float: {
    label: '<',
    key: 'less_than_float',
    valueType: 'FLOAT',
  },
  status_any: {
    label: 'is any of',
    key: 'status_any',
    valueType: 'ENUM_SET',
    enumLabels: MyStatusEnum,
  },
  status_not_any: {
    label: 'is not any of',
    key: 'status_not_any',
    valueType: 'ENUM_SET',
    enumLabels: MyStatusEnum,
  },
  ent_class_any_with_arbitrary_strings: {
    label: 'is any of (arbitrary allowed)',
    key: 'ent_class_any_with_arbitrary_strings',
    valueType: 'STRING_SET',
    allowArbitraryEntries: true,
  },
  caller_is: {
    label: 'is',
    key: 'caller_is',
    valueType: 'STRING',
  },
  macro_is: {
    label: 'is',
    key: 'macro_is',
    valueType: 'ENUM',
    enumLabels: MyMacroEnum,
  },
  macro_is_not: {
    label: 'is not',
    key: 'macro_is_not',
    valueType: 'ENUM',
    enumLabels: MyMacroEnum,
  },
  predictive_contain: {
    label: 'contains',
    key: 'predictive_contain',
    valueType: 'STRING',
  },
  predictive_not_contain: {
    label: 'does not contain',
    key: 'predictive_not_contain',
    valueType: 'STRING',
    allowArbitraryEntries: true,
  },
  newer_than_relative_date: {
    key: 'newer_than_relative_date',
    label: 'is newer than',
    isNegative: false,
    valueType: 'RELATIVE_DATE',
    allowableTenses: 'PAST_AND_FUTURE',
  },
  newer_than_absolute_date: {
    key: 'newer_than_absolute_date',
    label: 'is after',
    isNegative: false,
    valueType: 'ABSOLUTE_DATE',
    dateOnly: false,
  },
  newer_than_absolute_date_no_time: {
    key: 'newer_than_absolute_date_no_time',
    label: 'is after the day',
    isNegative: false,
    valueType: 'ABSOLUTE_DATE',
    dateOnly: true,
  },
  time_after: {
    label: 'is after',
    key: 'time_after',
    valueType: 'TIME',
  },
  filtered_time_after: {
    label: 'is after',
    key: 'filtered_time_after',
    valueType: 'TIME',
    // TODO: Fix me
    // Only show times between 4 - 11:59PM
    minValue: undefined,
    maxValue: undefined,
  },
  unread: {
    key: 'unread',
    label: '',
    valueType: 'NO_VALUE',
  },
} satisfies {[key: string]: OperatorConfig};

export const powerSearchExampleConfig: PowerSearchConfig = {
  name: 'FlipperPowerSearchExampleConfig',
  fields: {
    id: {
      key: 'id',
      label: 'ID',
      operators: {
        in: operators.in,
        not_in: operators.not_in,
      },
      operatorMenuDisplayOrder: ['in', 'not_in'],
    },
    title: {
      key: 'title',
      label: 'Title',
      operators: {
        contain: operators.contain,
        not_contain: operators.not_contain,
      },
      operatorMenuDisplayOrder: ['contain', 'not_contain'],
    },
    description: {
      key: 'description',
      label: 'Description',
      operators: {
        contain: operators.contain,
        not_contain: operators.not_contain,
      },
      operatorMenuDisplayOrder: ['contain', 'not_contain'],
    },
    placeholder: {
      key: 'placeholder',
      label: 'Placeholder',
      operators: {
        predictive_contain: operators.predictive_contain,
        predictive_not_contain: operators.predictive_not_contain,
      },
      operatorMenuDisplayOrder: [
        'predictive_contain',
        'predictive_not_contain',
      ],
    },
    lines: {
      key: 'lines',
      label: 'Line count',
      operators: {
        greater_than: operators.greater_than,
        less_than: operators.less_than,
      },
      operatorMenuDisplayOrder: ['greater_than', 'less_than'],
    },
    cost: {
      key: 'cost',
      label: 'Cost',
      operators: {
        greater_than_float: operators.greater_than_float,
        less_than_float: operators.less_than_float,
      },
      operatorMenuDisplayOrder: ['greater_than_float', 'less_than_float'],
    },
    status: {
      key: 'status',
      label: 'Status',
      operators: {
        status_any: operators.status_any,
        status_not_any: operators.status_not_any,
      },
      operatorMenuDisplayOrder: ['status_any', 'status_not_any'],
    },
    caller: {
      key: 'caller',
      label: 'Caller',
      operators: {
        caller_is: operators.caller_is,
      },
      operatorMenuDisplayOrder: ['caller_is'],
    },
    macro: {
      key: 'macro',
      label: 'Macro',
      operators: {
        macro_is: operators.macro_is,
        macro_is_not: operators.macro_is_not,
      },
      operatorMenuDisplayOrder: ['macro_is', 'macro_is_not'],
    },
    time: {
      key: 'time',
      label: 'Time',
      operators: {
        time_after: operators.time_after,
      },
      operatorMenuDisplayOrder: ['time_after'],
    },
    filtered_time: {
      key: 'filtered_time',
      label: 'Time After 4PM',
      operators: {
        filtered_time_after: operators.filtered_time_after,
      },
      operatorMenuDisplayOrder: ['filtered_time_after'],
    },
    last_update: {
      key: 'last_update',
      label: 'Last Update',
      operators: {
        newer_than_relative_date: operators.newer_than_relative_date,
        newer_than_absolute_date: operators.newer_than_absolute_date,
        newer_than_absolute_date_no_time:
          operators.newer_than_absolute_date_no_time,
      },
      operatorMenuDisplayOrder: [
        'newer_than_relative_date',
        'newer_than_absolute_date',
        'newer_than_absolute_date_no_time',
      ],
    },
    unread_only: {
      key: 'unread_only',
      label: 'Unread Only',
      operators: {
        unread: operators.unread,
      },
      operatorMenuDisplayOrder: ['unread_only'],
    },
    NESTED_FIELD: {
      key: 'NESTED_FIELD',
      label: '',
      operators: {
        AND: {
          key: 'AND',
          label: 'All of',
          valueType: 'NESTED',
        },
        NOT: {
          key: 'NOT',
          label: 'None of',
          valueType: 'NESTED',
        },
        OR: {
          key: 'OR',
          label: 'Any of',
          valueType: 'NESTED',
        },
      },
      operatorMenuDisplayOrder: ['AND', 'NOT', 'OR'],
    },
    CONTEXT_TOKEN: {
      key: 'CONTEXT_TOKEN',
      label: 'Context Token',
      operators: {
        CONTEXT_TOKEN: {
          key: 'CONTEXT_TOKEN',
          label: '',
          valueType: 'NO_VALUE',
        },
      },
      operatorMenuDisplayOrder: [],
    },
  },
};
