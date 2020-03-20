/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type FeedbackPrompt = {
  preSubmitHeading: string;
  postSubmitHeading: string;
  commentPlaceholder: string;
  bodyText: string;
  predefinedComments: Array<string>;
  shouldPopup: boolean;
};

export async function submitRating(
  _rating: number,
  _sessionId: string | null,
): Promise<void> {
  throw new Error('Method not implemented.');
}
export async function submitComment(
  _rating: number,
  _comment: string,
  _selectedPredefinedComments: string[],
  _allowUserInfoSharing: boolean,
  _sessionId: string | null,
): Promise<void> {
  throw new Error('Method not implemented.');
}
export async function dismiss(_sessionId: string | null): Promise<void> {
  throw new Error('Method not implemented.');
}
export async function getPrompt(): Promise<FeedbackPrompt> {
  throw new Error('Method not implemented.');
}
