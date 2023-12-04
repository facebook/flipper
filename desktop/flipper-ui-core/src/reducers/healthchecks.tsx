/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {produce} from 'immer';
import type {FlipperDoctor} from 'flipper-common';

export type State = {
  healthcheckReport: FlipperDoctor.HealthcheckReport;
  acknowledgedProblems: string[];
};

export type Action =
  | {
      type: 'START_HEALTHCHECKS';
      payload: FlipperDoctor.Healthchecks;
    }
  | {
      type: 'FINISH_HEALTHCHECKS';
    }
  | {
      type: 'UPDATE_HEALTHCHECK_RESULT';
      payload: {
        categoryKey: string;
        itemKey: string;
        result: FlipperDoctor.HealthcheckResult;
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
    result: {status: 'IN_PROGRESS'},
    categories: {},
  },
  acknowledgedProblems: [],
};

function recomputeHealthcheckStatus(draft: State): void {
  draft.healthcheckReport.result = computeAggregatedResult(
    Object.values(draft.healthcheckReport.categories).map((c) => c.result),
  );
}

function computeAggregatedResult(
  results: FlipperDoctor.HealthcheckResult[],
): FlipperDoctor.HealthcheckResult {
  return results.some((r) => r.status === 'IN_PROGRESS')
    ? {status: 'IN_PROGRESS'}
    : results.every((r) => r.status === 'SUCCESS')
    ? {status: 'SUCCESS'}
    : results.some((r) => r.status === 'FAILED' && !r.isAcknowledged)
    ? {status: 'FAILED', isAcknowledged: false}
    : results.some((r) => r.status === 'FAILED')
    ? {status: 'FAILED', isAcknowledged: true}
    : results.some((r) => r.status === 'WARNING' && !r.isAcknowledged)
    ? {status: 'WARNING', isAcknowledged: false}
    : results.some((r) => r.status === 'WARNING')
    ? {status: 'WARNING', isAcknowledged: true}
    : {status: 'SKIPPED'};
}

const updateCheckResult = produce(
  (
    draft: State,
    {
      categoryKey,
      itemKey,
      result,
    }: {
      categoryKey: string;
      itemKey: string;
      result: FlipperDoctor.HealthcheckResult;
    },
  ) => {
    const category = draft.healthcheckReport.categories[categoryKey];
    const item = category.checks[itemKey];
    Object.assign(item.result, result);
    item.result.isAcknowledged = draft.acknowledgedProblems.includes(item.key);
  },
);

function createDict<T>(pairs: [string, T][]): FlipperDoctor.Dictionary<T> {
  const obj: FlipperDoctor.Dictionary<T> = {};
  for (const pair of pairs) {
    obj[pair[0]] = pair[1];
  }
  return obj;
}

const start = produce(
  (draft: State, healthchecks: FlipperDoctor.Healthchecks) => {
    draft.healthcheckReport = {
      result: {status: 'IN_PROGRESS'},
      categories: createDict<FlipperDoctor.HealthcheckReportCategory>(
        Object.entries(healthchecks).map(([categoryKey, category]) => {
          if (category.isSkipped) {
            return [
              categoryKey,
              {
                key: categoryKey,
                result: {
                  status: 'SKIPPED',
                  message: ['skipped', {reason: category.skipReason}],
                },
                label: category.label,
                checks: createDict<FlipperDoctor.HealthcheckReportItem>([]),
              } satisfies FlipperDoctor.HealthcheckReportCategory,
            ];
          }
          return [
            categoryKey,
            {
              key: categoryKey,
              result: {status: 'IN_PROGRESS'},
              label: category.label,
              checks: createDict<FlipperDoctor.HealthcheckReportItem>(
                category.healthchecks.map((check) => [
                  check.key,
                  {
                    key: check.key,
                    result: {status: 'IN_PROGRESS'},
                    label: check.label,
                  },
                ]),
              ),
            },
          ];
        }),
      ),
    };
  },
);

const finish = produce((draft: State) => {
  Object.values(draft.healthcheckReport.categories)
    .filter((cat) => cat.result.status !== 'SKIPPED')
    .forEach((cat) => {
      cat.result.message = undefined;
      cat.result = computeAggregatedResult(
        Object.values(cat.checks).map((c) => c.result),
      );
    });
  recomputeHealthcheckStatus(draft);
  if (draft.healthcheckReport.result.status === 'SUCCESS') {
    setAcknowledgedProblemsToEmpty(draft);
  }
});

const acknowledge = produce((draft: State) => {
  draft.acknowledgedProblems = ([] as string[]).concat(
    ...Object.values(draft.healthcheckReport.categories).map((cat) =>
      Object.values(cat.checks)
        .filter(
          (chk) =>
            chk.result.status === 'FAILED' || chk.result.status === 'WARNING',
        )
        .map((chk) => chk.key),
    ),
  );
  Object.values(draft.healthcheckReport.categories).forEach((cat) => {
    cat.result.isAcknowledged = true;
    Object.values(cat.checks).forEach((chk) => {
      chk.result.isAcknowledged = true;
    });
  });
  recomputeHealthcheckStatus(draft);
});

function setAcknowledgedProblemsToEmpty(draft: State) {
  draft.acknowledgedProblems = [];
  Object.values(draft.healthcheckReport.categories).forEach((cat) => {
    cat.result.isAcknowledged = false;
    Object.values(cat.checks).forEach((chk) => {
      chk.result.isAcknowledged = false;
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
  categoryKey: string,
  itemKey: string,
  result: FlipperDoctor.HealthcheckResult,
): Action => ({
  type: 'UPDATE_HEALTHCHECK_RESULT',
  payload: {
    categoryKey,
    itemKey,
    result,
  },
});

export const startHealthchecks = (
  healthchecks: FlipperDoctor.Healthchecks,
): Action => ({
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
