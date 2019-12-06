/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';

export type State = {
  healthcheckReport: HealthcheckReport;
};

export type Action =
  | {
      type: 'INIT_HEALTHCHECK_REPORT';
      payload: HealthcheckReport;
    }
  | {
      type: 'UPDATE_HEALTHCHECK_REPORT_ITEM';
      payload: {
        categoryIdx: number;
        itemIdx: number;
        item: HealthcheckReportItem;
      };
    }
  | {
      type: 'START_HEALTHCHECKS';
    }
  | {
      type: 'FINISH_HEALTHCHECKS';
    };

const INITIAL_STATE: State = {
  healthcheckReport: {
    isHealthcheckInProgress: false,
    categories: [],
  },
};

export type HealthcheckStatus =
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'WARNING';

export type HealthcheckResult = {
  status: HealthcheckStatus;
  message?: string;
  helpUrl?: string;
};

export type HealthcheckReportItem = {
  label: string;
} & HealthcheckResult;

export type HealthcheckReportCategory = {
  label: string;
  status: HealthcheckStatus;
  checks: Array<HealthcheckReportItem>;
};

export type HealthcheckReport = {
  isHealthcheckInProgress: boolean;
  categories: Array<HealthcheckReportCategory>;
};

export default function reducer(
  state: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'INIT_HEALTHCHECK_REPORT') {
    return {
      ...state,
      healthcheckReport: action.payload,
    };
  } else if (action.type === 'START_HEALTHCHECKS') {
    return {
      ...state,
      healthcheckReport: {
        ...state.healthcheckReport,
        isHealthcheckInProgress: true,
      },
    };
  } else if (action.type === 'FINISH_HEALTHCHECKS') {
    return {
      ...state,
      healthcheckReport: {
        ...state.healthcheckReport,
        isHealthcheckInProgress: false,
      },
    };
  } else if (action.type === 'UPDATE_HEALTHCHECK_REPORT_ITEM') {
    return {
      ...state,
      healthcheckReport: {
        ...state.healthcheckReport,
        categories: [
          ...state.healthcheckReport.categories.slice(
            0,
            action.payload.categoryIdx,
          ),
          {
            ...state.healthcheckReport.categories[action.payload.categoryIdx],
            checks: [
              ...state.healthcheckReport.categories[
                action.payload.categoryIdx
              ].checks.slice(0, action.payload.itemIdx),
              {
                ...action.payload.item,
              },
              ...state.healthcheckReport.categories[
                action.payload.categoryIdx
              ].checks.slice(action.payload.itemIdx + 1),
            ],
          },
          ...state.healthcheckReport.categories.slice(
            action.payload.categoryIdx + 1,
          ),
        ],
      },
    };
  } else {
    return state;
  }
}

export const initHealthcheckReport = (report: HealthcheckReport): Action => ({
  type: 'INIT_HEALTHCHECK_REPORT',
  payload: report,
});

export const updateHealthcheckReportItem = (
  categoryIdx: number,
  itemIdx: number,
  item: HealthcheckReportItem,
): Action => ({
  type: 'UPDATE_HEALTHCHECK_REPORT_ITEM',
  payload: {
    categoryIdx,
    itemIdx,
    item,
  },
});

export const startHealthchecks = (): Action => ({
  type: 'START_HEALTHCHECKS',
});

export const finishHealthchecks = (): Action => ({
  type: 'FINISH_HEALTHCHECKS',
});
