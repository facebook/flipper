/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo} from 'react';
import {Modal, Typography, Button, notification} from 'antd';
import {PlatformSelectWizard} from './PlatformSelectWizard';
import SetupDoctorScreen from '../sandy-chrome/SetupDoctorScreen';
import {useDispatch, useStore} from '../utils/useStore';
import {SignInSheet} from '../chrome/fb-stubs/SignInSheet';
import {toggleSetupWizardOpen} from '../reducers/application';
import PWAInstallationWizard from './PWAppInstallationWizard';
import constants from '../fb-stubs/constants';

type StepName = 'platform' | 'doctor' | 'login' | 'pwa';
type StepState = 'init' | 'pending' | 'success' | 'fail';

function getNextStep(currentStep: StepName): StepName {
  if (!constants.IS_PUBLIC_BUILD) {
    return (
      {
        platform: 'doctor',
        doctor: 'login',
        login: 'pwa',
      } as Record<StepName, StepName>
    )[currentStep];
  } else {
    return (
      {
        platform: 'doctor',
        doctor: 'pwa',
      } as Record<StepName, StepName>
    )[currentStep];
  }
}
function getPrevStep(currentStep: StepName): StepName {
  if (!constants.IS_PUBLIC_BUILD) {
    return (
      {
        doctor: 'platform',
        login: 'doctor',
        pwa: 'login',
      } as Record<StepName, StepName>
    )[currentStep];
  } else {
    return (
      {
        doctor: 'platform',
        pwa: 'doctor',
      } as Record<StepName, StepName>
    )[currentStep];
  }
}
function getCurrentStepNumber(step: StepName): number {
  if (!constants.IS_PUBLIC_BUILD) {
    return (
      {
        platform: 1,
        doctor: 2,
        login: 3,
        pwa: 4,
      } as Record<StepName, number>
    )[step];
  } else {
    return (
      {
        platform: 1,
        doctor: 2,
        pwa: 3,
      } as Record<StepName, number>
    )[step];
  }
}

function Footer({
  onNext,
  nextDisabled,
  onPrev,
  hasNext,
  onSkip,
}: {
  onNext: () => void;
  nextDisabled: boolean;
  onPrev: (() => void) | void;
  onSkip: null | (() => void);
  hasNext: boolean;
}) {
  return (
    <div style={{display: 'flex'}}>
      {onSkip && <Button onClick={onSkip}>Skip Setup Wizard</Button>}
      <div style={{marginLeft: 'auto'}}>
        {onPrev && <Button onClick={onPrev}>Back</Button>}
        {hasNext && (
          <Button onClick={onNext} disabled={nextDisabled} type="primary">
            Next
          </Button>
        )}
      </div>
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
  const [platformSettingsChanged, setPlatformSettingsChanged] =
    React.useState(false);
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
        return (
          <PlatformSelectWizard onSettingsChange={setPlatformSettingsChanged} />
        );
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
        return <PWAInstallationWizard onInstall={onHide} />;
    }
  }, [currentStep, loginState, onHide]);
  const title = useMemo(() => {
    let name = '';
    switch (currentStep) {
      case 'platform':
        name = 'Select development environment';
        break;
      case 'doctor':
        name = 'Health check';
        break;
      case 'login':
        name = 'Log in';
        break;
      case 'pwa':
        name = 'Install PWA';
        break;
    }
    return (
      <Typography.Title>
        {name} {getCurrentStepNumber(currentStep)} /{' '}
        {constants.IS_PUBLIC_BUILD ? 3 : 4}
      </Typography.Title>
    );
  }, [currentStep]);

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
          onSkip={
            closable
              ? null
              : () => {
                  onClose();
                  notification.warn({
                    key: 'setup-wizard-reopen',
                    message: 'Setup Wizard is skipped',
                    description: (
                      <>
                        Flipper may not be configured fully or function
                        properly. You can reopen and finish setup from the menu{' '}
                        {'More\u00A0⚙︎\u00A0>\u00A0Setup\u00A0wizard'}
                      </>
                    ),
                    duration: 15,
                  });
                }
          }
          onNext={() => {
            if (currentStep !== 'pwa') {
              setCurrentStep(getNextStep(currentStep));
            }
          }}
          onPrev={
            currentStep === 'platform'
              ? undefined
              : () => setCurrentStep(getPrevStep(currentStep))
          }
          nextDisabled={
            (currentStep === 'platform' && platformSettingsChanged) ||
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
      {title}
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
    localStorage.getItem(SETUP_WIZARD_FINISHED_LOCAL_STORAGE_KEY) != null
  );
}
