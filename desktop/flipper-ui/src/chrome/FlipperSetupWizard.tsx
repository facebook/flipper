/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo} from 'react';
import {Modal, Typography, Button} from 'antd';
import {PlatformSelectWizard} from './PlatformSelectWizard';
import SetupDoctorScreen from '../sandy-chrome/SetupDoctorScreen';
import {useDispatch, useStore} from '../utils/useStore';
import {SignInSheet} from '../chrome/fb-stubs/SignInSheet';
import {toggleSetupWizardOpen} from '../reducers/application';
import PWAInstallationWizard from './PWAppInstallationWizard';

type StepName = 'platform' | 'doctor' | 'login' | 'pwa';
type StepState = 'init' | 'pending' | 'success' | 'fail';

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
  const [currentStep, setCurrentStep] = React.useState<StepName>('platform');
  const doctorState = useStore<StepState>((store) => {
    const reportStatus = store.healthchecks.healthcheckReport.result.status;
    switch (reportStatus) {
      case 'SUCCESS':
      case 'WARNING':
      case 'SKIPPED':
        return 'success';
      case 'FAILED':
        return 'fail';
      case 'IN_PROGRESS':
        return 'pending';
      default:
        return 'init';
    }
  });
  const loginState = useStore<StepState>((store) =>
    store.user.id != null ? 'success' : 'init',
  );
  const dispatch = useDispatch();
  const isLastOptionalStep = currentStep === 'pwa';
  const closable = isLastOptionalStep ? true : closableProp ?? closableState;
  const content = useMemo(() => {
    switch (currentStep) {
      case 'platform':
        return <PlatformSelectWizard />;
      case 'doctor':
        return <SetupDoctorScreen modal={false} visible onClose={() => {}} />;
      case 'login':
        return loginState === 'success' ? (
          <Typography.Paragraph>You are logged in</Typography.Paragraph>
        ) : (
          <SignInSheet
            onHide={() => {
              setCurrentStep('pwa');
            }}
            fromSetupWizard
          />
        );
      case 'pwa':
        return <PWAInstallationWizard />;
    }
  }, [currentStep, loginState]);

  React.useEffect(
    () => {
      dispatch(toggleSetupWizardOpen(true));
      return () => {
        dispatch(toggleSetupWizardOpen(false));
      };
    },
    // disabled to make sure it is called on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const onClose = () => {
    onHide();
    localStorage.setItem(SETUP_WIZARD_FINISHED_LOCAL_STORAGE_KEY, 'true');
  };

  return (
    <Modal
      open
      centered
      closable={closable}
      footer={
        <Footer
          onNext={() => {
            if (currentStep !== 'pwa') {
              setCurrentStep(
                (
                  {
                    platform: 'doctor',
                    doctor: 'login',
                    login: 'pwa',
                  } as Record<StepName, StepName>
                )[currentStep],
              );
            }
          }}
          onPrev={
            currentStep === 'platform'
              ? undefined
              : () =>
                  setCurrentStep(
                    (
                      {
                        doctor: 'platform',
                        login: 'doctor',
                        pwa: 'login',
                      } as Record<StepName, StepName>
                    )[currentStep],
                  )
          }
          nextDisabled={
            (currentStep === 'doctor' && doctorState !== 'success') ||
            (currentStep === 'login' && loginState !== 'success')
          }
          hasNext={!isLastOptionalStep}
        />
      }
      width={650}
      onCancel={() => {
        if (closable) {
          onClose();
        }
      }}>
      <Typography.Title>Flipper Setup Wizard</Typography.Title>
      <hr />
      {content}
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
