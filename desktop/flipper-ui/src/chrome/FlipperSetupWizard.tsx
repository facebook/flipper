/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Modal, Typography, Button} from 'antd';

type StepName = 'platform' | 'doctor' | 'login' | 'pwa';
type Step = {
  key: StepName;
  comp: () => JSX.Element;
};

const STEPS: Step[] = [
  {
    key: 'platform',
    comp: () => <div>Select Platform</div>,
  },
  {
    key: 'doctor',
    comp: () => <div>Doctor</div>,
  },
  {
    key: 'login',
    comp: () => <div>Login</div>,
  },
  {
    key: 'pwa',
    comp: () => <div>Install Pwa</div>,
  },
];

function Footer({
  onNext,
  nextDisabled,
  onPrev,
  hasNext,
}: {
  onNext: () => void;
  nextDisabled: boolean;
  onPrev: (() => void) | void;
  hasNext: boolean;
}) {
  return (
    <div>
      {onPrev && <Button onClick={onPrev}>Back</Button>}
      {hasNext && (
        <Button onClick={onNext} disabled={nextDisabled} type="primary">
          Next
        </Button>
      )}
    </div>
  );
}

export function FlipperSetupWizard({
  onHide,
  closable: closableProp,
}: {
  onHide: () => void;
  closable?: boolean;
}) {
  const [closableState, _setClosableState] = React.useState();
  const [step, setStep] = React.useState(STEPS[0]);
  const isLastOptionalStep = step.key === 'pwa';
  const closable = isLastOptionalStep ? true : closableProp ?? closableState;
  return (
    <Modal
      open
      centered
      closable={closable}
      footer={
        <Footer
          onNext={() => {
            const nextStep = STEPS[STEPS.indexOf(step) + 1];
            if (nextStep != null) {
              setStep(STEPS[STEPS.indexOf(step) + 1]);
            }
          }}
          onPrev={
            step.key === 'platform'
              ? undefined
              : () => setStep(STEPS[STEPS.indexOf(step) - 1])
          }
          nextDisabled={step.key === 'pwa'}
          hasNext={!isLastOptionalStep}
        />
      }
      width={650}
      onCancel={() => {
        if (closable) {
          onHide();
        }
      }}>
      <Typography.Title>Flipper Setup Wizard</Typography.Title>
      <hr />
      {<step.comp />}
    </Modal>
  );
}

const SETUP_WIZARD_FINISHED_LOCAL_STORAGE_KEY = 'setupWizardCompleted';

export function hasSetupWizardCompleted(
  localStorage: Storage | undefined,
): boolean {
  return (
    !localStorage ||
    localStorage.getItem(SETUP_WIZARD_FINISHED_LOCAL_STORAGE_KEY) !== 'true'
  );
}
