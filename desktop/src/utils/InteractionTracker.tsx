/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getInstance as getLogger} from '../fb-stubs/Logger';

export function reportInteraction(
  componentType: string,
  componentIdentifier: string,
) {
  const tracker = new InteractionTracker(componentType, componentIdentifier);
  return tracker.interaction.bind(tracker);
}

class InteractionTracker {
  static numberOfInteractions = 0;

  type: string;
  id: string;

  constructor(componentType: string, componentIdentifier: string) {
    this.type = componentType;
    this.id = componentIdentifier;
  }

  interaction = (name: string, data: any): void => {
    getLogger().track('usage', 'interaction', {
      interaction: InteractionTracker.numberOfInteractions++,
      type: this.type,
      id: this.id,
      name,
      data,
    });
  };
}
