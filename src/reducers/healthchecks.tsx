/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {produce} from 'immer';
import {Healthchecks} from 'flipper-doctor';

export type State = {
  healthcheckReport: HealthcheckReport;
  acknowledgedProblems: string[];
};

export type Action =
  | {
      type: 'START_HEALTHCHECKS';
      payload: Healthchecks;
    }
  | {
      type: 'FINISH_HEALTHCHECKS';
    }
  | {
      type: 'UPDATE_HEALTHCHECK_RESULT';
      payload: {
        categoryIdx: number;
        itemIdx: number;
        result: HealthcheckResult;
      };
    }
  | {
      type: 'ACKNOWLEDGE_PROBLEMS';
    }
  | {
      type: 'RESET_ACKNOWLEDGED_PROBLEMS';
    };

const INITIAL_STATE: State = {
  healthcheckReport: {
    status: 'IN_PROGRESS',
    categories: [],
  },
  acknowledgedProblems: [],
};

export type HealthcheckStatus =
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'FAILED_ACKNOWLEDGED'
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
  status: HealthcheckStatus;
  categories: Array<HealthcheckReportCategory>;
};

function getHealthcheckIdentifier(
  category: HealthcheckReportCategory,
  item: HealthcheckReportItem,
) {
  return `${category.label} : ${item.label}`;
}

function recomputeHealthcheckStatus(draft: State): void {
  draft.healthcheckReport.status = computeAggregatedStatus(
    draft.healthcheckReport.categories.map(c => c.status),
  );
}

function computeAggregatedStatus(
  statuses: HealthcheckStatus[],
): HealthcheckStatus {
  return statuses.some(s => s === 'IN_PROGRESS')
    ? 'IN_PROGRESS'
    : statuses.every(s => s === 'SUCCESS')
    ? 'SUCCESS'
    : statuses.some(s => s === 'FAILED')
    ? 'FAILED'
    : statuses.some(s => s === 'FAILED_ACKNOWLEDGED')
    ? 'FAILED_ACKNOWLEDGED'
    : statuses.some(s => s === 'WARNING')
    ? 'WARNING'
    : 'SKIPPED';
}

const updateCheckResult = produce(
  (
    draft: State,
    {
      categoryIdx,
      itemIdx,
      result,
    }: {
      categoryIdx: number;
      itemIdx: number;
      result: HealthcheckResult;
    },
  ) => {
    const category = draft.healthcheckReport.categories[categoryIdx];
    const item = category.checks[itemIdx];
    Object.assign(item, result);
    if (
      result.status === 'FAILED' &&
      draft.acknowledgedProblems.includes(
        getHealthcheckIdentifier(category, item),
      )
    ) {
      item.status = 'FAILED_ACKNOWLEDGED';
    }
  },
);

const start = produce((draft: State, healthchecks: Healthchecks) => {
  draft.healthcheckReport = {
    status: 'IN_PROGRESS',
    categories: Object.values(healthchecks)
      .map(category => {
        if (category.isSkipped) {
          return {
            status: 'SKIPPED',
            label: category.label,
            checks: [],
            message: category.skipReason,
          };
        }
        return {
          status: 'IN_PROGRESS',
          label: category.label,
          checks: category.healthchecks.map(x => ({
            status: 'IN_PROGRESS',
            label: x.label,
          })),
        };
      })
      .filter(x => !!x)
      .map(x => x as HealthcheckReportCategory),
  };
});

const finish = produce((draft: State) => {
  draft.healthcheckReport.categories
    .filter(cat => cat.status !== 'SKIPPED')
    .forEach(cat => {
      cat.message = undefined;
      cat.status = computeAggregatedStatus(cat.checks.map(c => c.status));
    });
  recomputeHealthcheckStatus(draft);
  if (draft.healthcheckReport.status === 'SUCCESS') {
    setAcknowledgedProblemsToEmpty(draft);
  }
});

const acknowledge = produce((draft: State) => {
  draft.acknowledgedProblems = ([] as string[]).concat(
    ...draft.healthcheckReport.categories.map(cat =>
      cat.checks
        .filter(
          chk =>
            chk.status === 'FAILED' ||
            chk.status === 'FAILED_ACKNOWLEDGED' ||
            chk.status === 'WARNING',
        )
        .map(chk => getHealthcheckIdentifier(cat, chk)),
    ),
  );
  draft.healthcheckReport.categories.forEach(cat => {
    if (cat.status === 'FAILED') {
      cat.status = 'FAILED_ACKNOWLEDGED';
    }
    cat.checks.forEach(chk => {
      if (chk.status == 'FAILED') {
        chk.status = 'FAILED_ACKNOWLEDGED';
      }
    });
  });
  recomputeHealthcheckStatus(draft);
});

function setAcknowledgedProblemsToEmpty(draft: State) {
  draft.acknowledgedProblems = [];
  draft.healthcheckReport.categories.forEach(cat => {
    if (cat.status === 'FAILED_ACKNOWLEDGED') {
      cat.status = 'FAILED';
    }
    cat.checks.forEach(chk => {
      if (chk.status == 'FAILED_ACKNOWLEDGED') {
        chk.status = 'FAILED';
      }
    });
  });
}

const resetAcknowledged = produce((draft: State) => {
  setAcknowledgedProblemsToEmpty(draft);
  recomputeHealthcheckStatus(draft);
});

export default function reducer(
  draft: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  return action.type === 'START_HEALTHCHECKS'
    ? start(draft, action.payload)
    : action.type === 'FINISH_HEALTHCHECKS'
    ? finish(draft)
    : action.type === 'UPDATE_HEALTHCHECK_RESULT'
    ? updateCheckResult(draft, action.payload)
    : action.type === 'ACKNOWLEDGE_PROBLEMS'
    ? acknowledge(draft)
    : action.type === 'RESET_ACKNOWLEDGED_PROBLEMS'
    ? resetAcknowledged(draft)
    : draft;
}

export const updateHealthcheckResult = (
  categoryIdx: number,
  itemIdx: number,
  result: HealthcheckResult,
): Action => ({
  type: 'UPDATE_HEALTHCHECK_RESULT',
  payload: {
    categoryIdx,
    itemIdx,
    result,
  },
});

export const startHealthchecks = (healthchecks: Healthchecks): Action => ({
  type: 'START_HEALTHCHECKS',
  payload: healthchecks,
});

export const finishHealthchecks = (): Action => ({
  type: 'FINISH_HEALTHCHECKS',
});

export const acknowledgeProblems = (): Action => ({
  type: 'ACKNOWLEDGE_PROBLEMS',
});

export const resetAcknowledgedProblems = (): Action => ({
  type: 'RESET_ACKNOWLEDGED_PROBLEMS',
});
