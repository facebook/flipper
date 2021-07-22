/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Alert, Input, Modal, Typography} from 'antd';
import {Atom, createState, useValue} from '../state/atom';
import React from 'react';
import {renderReactRoot} from '../utils/renderReactRoot';
import {Layout} from './Layout';

type DialogResult<T> = Promise<false | T> & {close: () => void};

type BaseDialogOptions = {
  title: string;
  okText?: string;
  cancelText?: string;
};

export const Dialog = {
  show<T>(
    opts: BaseDialogOptions & {
      children: React.ReactNode;
      onConfirm: () => Promise<T>;
    },
  ): DialogResult<T> {
    let cancel: () => void;

    return Object.assign(
      new Promise<false | T>((resolve) => {
        renderReactRoot((hide) => {
          const submissionError = createState<string>('');
          cancel = () => {
            hide();
            resolve(false);
          };
          return (
            <Modal
              title={opts.title}
              visible
              okText={opts.okText}
              cancelText={opts.cancelText}
              onOk={async () => {
                try {
                  const value = await opts.onConfirm();
                  hide();
                  resolve(value);
                } catch (e) {
                  submissionError.set(e.toString());
                }
              }}
              onCancel={cancel}
              width={400}>
              <Layout.Container gap>
                {opts.children}
                <SubmissionError submissionError={submissionError} />
              </Layout.Container>
            </Modal>
          );
        });
      }),
      {
        close() {
          cancel();
        },
      },
    );
  },

  confirm({
    message,
    ...rest
  }: {
    message: string | React.ReactElement;
  } & BaseDialogOptions): DialogResult<true> {
    return Dialog.show<true>({
      ...rest,
      children: message,
      onConfirm: async () => true,
    });
  },

  prompt({
    message,
    defaultValue,
    onConfirm,
    ...rest
  }: BaseDialogOptions & {
    message: string | React.ReactElement;
    defaultValue?: string;
    onConfirm?: (value: string) => Promise<string>;
  }): DialogResult<string> {
    const inputValue = createState(defaultValue ?? '');
    return Dialog.show<string>({
      ...rest,
      children: (
        <>
          <Typography.Text>{message}</Typography.Text>
          <PromptInput inputValue={inputValue} />
        </>
      ),
      onConfirm: async () => {
        const value = inputValue.get();
        if (onConfirm) {
          return await onConfirm(value);
        }
        return value;
      },
    });
  },
};

function PromptInput({inputValue}: {inputValue: Atom<string>}) {
  const currentValue = useValue(inputValue);
  return (
    <Input
      value={currentValue}
      onChange={(e) => {
        inputValue.set(e.target.value);
      }}
    />
  );
}

function SubmissionError({submissionError}: {submissionError: Atom<string>}) {
  const currentError = useValue(submissionError);
  return currentError ? <Alert type="error" message={currentError} /> : null;
}
