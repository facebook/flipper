/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {OperatorConfig, PowerSearchConfig} from './PowerSearchConfig';

const MyMacroEnum = {
  SURE_WHY_NOT: 'surewhynot',
  DOGSCIENCE: 'dogscience',
  TEST_IN_PROD: 'testinproduction',
};

const operators = {
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
  contains_any_of: {
    label: 'contains any of',
    key: 'contains_any_of',
    valueType: 'STRING_SET',
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
  caller_is: {
    label: 'is',
    key: 'caller_is',
    valueType: 'STRING',
  },
  macro_is_any_of: {
    label: 'is any of',
    key: 'macro_is_any_of',
    valueType: 'ENUM_SET',
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
  },
  newer_than_absolute_date: {
    key: 'newer_than_absolute_date',
    label: 'is after',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: false,
  },
  newer_than_absolute_date_no_time: {
    key: 'newer_than_absolute_date_no_time',
    label: 'is after the day',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: true,
  },
  unread: {
    key: 'unread',
    label: '',
    valueType: 'NO_VALUE',
  },
} satisfies {[key: string]: OperatorConfig};

export const powerSearchExampleConfig: PowerSearchConfig = {
  fields: {
    title: {
      key: 'title',
      label: 'Title',
      operators: {
        contain: operators.contain,
        not_contain: operators.not_contain,
      },
    },
    description: {
      key: 'description',
      label: 'Description',
      operators: {
        contain: operators.contain,
        not_contain: operators.not_contain,
        contains_any_of: operators.contains_any_of,
      },
    },
    placeholder: {
      key: 'placeholder',
      label: 'Placeholder',
      operators: {
        predictive_contain: operators.predictive_contain,
        predictive_not_contain: operators.predictive_not_contain,
      },
    },
    lines: {
      key: 'lines',
      label: 'Line count',
      operators: {
        greater_than: operators.greater_than,
        less_than: operators.less_than,
      },
    },
    cost: {
      key: 'cost',
      label: 'Cost',
      operators: {
        greater_than_float: operators.greater_than_float,
        less_than_float: operators.less_than_float,
      },
    },
    date: {
      key: 'date',
      label: 'Date',
      operators: {
        newer_than_absolute_date_no_time:
          operators.newer_than_absolute_date_no_time,
        newer_than_absolute_date: operators.newer_than_absolute_date,
      },
    },
    caller: {
      key: 'caller',
      label: 'Caller',
      operators: {
        caller_is: operators.caller_is,
      },
    },
    unread_only: {
      key: 'unread_only',
      label: 'Unread Only',
      operators: {
        unread: operators.unread,
      },
    },
  },
};
