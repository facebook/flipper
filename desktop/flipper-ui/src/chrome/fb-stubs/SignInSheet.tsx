/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function SignInSheet(_props: {
  fromSetupWizard: boolean;
  onHide: () => void;
}) {
  return null;
}

export function isSheetOpen(): boolean {
  return false;
}

export async function showLoginDialog(
  _initialToken: string = '',
): Promise<boolean> {
  return false;
}
