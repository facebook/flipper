/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Logger from '../fb-stubs/Logger.js';

export function reportInteraction(
  componentType: string,
  componentIdentifier: string,
) {
  const tracker = new InteractionTracker(componentType, componentIdentifier);
  return tracker.interaction.bind(tracker);
}

class InteractionTracker {
  static logger = new Logger();
  static numberOfInteractions = 0;

  type: string;
  id: string;
  interaction: (name: string, data: any) => void;

  constructor(componentType: string, componentIdentifier: string) {
    this.type = componentType;
    this.id = componentIdentifier;
  }

  interaction = (name: string, data: any) => {
    InteractionTracker.logger.track('usage', 'interaction', {
      interaction: InteractionTracker.numberOfInteractions++,
      type: this.type,
      id: this.id,
      name,
      data,
    });
  };
}
