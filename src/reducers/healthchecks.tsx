/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {produce} from 'immer';
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
      type: 'UPDATE_HEALTHCHECK_REPORT_ITEM_STATUS';
      payload: {
        categoryIdx: number;
        itemIdx: number;
        status: HealthcheckResult;
      };
    }
  | {
      type: 'UPDATE_HEALTHCHECK_REPORT_CATEGORY_STATUS';
      payload: {
        categoryIdx: number;
        status: HealthcheckResult;
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
  | 'SKIPPED'
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
  checks: Array<HealthcheckReportItem>;
} & HealthcheckResult;

export type HealthcheckReport = {
  isHealthcheckInProgress: boolean;
  categories: Array<HealthcheckReportCategory>;
};

const updateReportItem = produce(
  (
    draft: State,
    payload: {
      categoryIdx: number;
      itemIdx: number;
      status: HealthcheckResult;
    },
  ) => {
    Object.assign(
      draft.healthcheckReport.categories[payload.categoryIdx].checks[
        payload.itemIdx
      ],
      payload.status,
    );
  },
);

const updateCategoryStatus = produce(
  (draft: State, payload: {categoryIdx: number; status: HealthcheckResult}) => {
    Object.assign(
      draft.healthcheckReport.categories[payload.categoryIdx],
      payload.status,
    );
  },
);

const initReport = produce((draft: State, report: HealthcheckReport) => {
  draft.healthcheckReport = report;
});

const setIsInProgress = produce((draft: State, isInProgress: boolean) => {
  draft.healthcheckReport.isHealthcheckInProgress = isInProgress;
});

export default function reducer(
  draft: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  return action.type === 'INIT_HEALTHCHECK_REPORT'
    ? initReport(draft, action.payload)
    : action.type === 'START_HEALTHCHECKS'
    ? setIsInProgress(draft, true)
    : action.type === 'FINISH_HEALTHCHECKS'
    ? setIsInProgress(draft, false)
    : action.type === 'UPDATE_HEALTHCHECK_REPORT_ITEM_STATUS'
    ? updateReportItem(draft, action.payload)
    : action.type === 'UPDATE_HEALTHCHECK_REPORT_CATEGORY_STATUS'
    ? updateCategoryStatus(draft, action.payload)
    : draft;
}

export const initHealthcheckReport = (report: HealthcheckReport): Action => ({
  type: 'INIT_HEALTHCHECK_REPORT',
  payload: report,
});

export const updateHealthcheckReportItemStatus = (
  categoryIdx: number,
  itemIdx: number,
  status: HealthcheckResult,
): Action => ({
  type: 'UPDATE_HEALTHCHECK_REPORT_ITEM_STATUS',
  payload: {
    categoryIdx,
    itemIdx,
    status,
  },
});

export const updateHealthcheckReportCategoryStatus = (
  categoryIdx: number,
  status: HealthcheckResult,
): Action => ({
  type: 'UPDATE_HEALTHCHECK_REPORT_CATEGORY_STATUS',
  payload: {
    categoryIdx,
    status,
  },
});

export const startHealthchecks = (): Action => ({
  type: 'START_HEALTHCHECKS',
});

export const finishHealthchecks = (): Action => ({
  type: 'FINISH_HEALTHCHECKS',
});
