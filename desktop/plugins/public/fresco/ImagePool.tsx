/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ImageId, ImageData} from './api';

export type ImagesMap = {[imageId in ImageId]: ImageData};

const maxInflightRequests = 10;

export default class ImagePool {
  cache: ImagesMap = {};
  requested: {[imageId in ImageId]: boolean} = {};
  queued: Array<ImageId> = [];
  inFlightRequests: number = 0;
  fetchImage: (imageId: ImageId) => void;
  updateNotificationScheduled: boolean = false;
  onPoolUpdated: (images: ImagesMap) => void;

  constructor(
    fetchImage: (imageId: ImageId) => void,
    onPoolUpdated: (images: ImagesMap) => void,
  ) {
    this.fetchImage = fetchImage;
    this.onPoolUpdated = onPoolUpdated;
  }

  getImages(): ImagesMap {
    return {...this.cache};
  }

  fetchImages(ids: Array<string>) {
    for (const id of ids) {
      if (!this.cache[id] && !this.requested[id]) {
        this.requested[id] = true;

        if (this.inFlightRequests < maxInflightRequests) {
          this.inFlightRequests++;
          this.fetchImage(id);
        } else {
          this.queued.unshift(id);
        }
      }
    }
  }

  clear() {
    this.cache = {};
    this.requested = {};
  }

  _fetchCompleted(image: ImageData): void {
    this.cache[image.imageId] = image;
    delete this.requested[image.imageId];

    if (this.queued.length > 0) {
      const popped = this.queued.pop() as string;
      this.fetchImage(popped);
    } else {
      this.inFlightRequests--;
    }

    if (!this.updateNotificationScheduled) {
      this.updateNotificationScheduled = true;
      window.setTimeout(this._notify, 1000);
    }
  }

  _notify = () => {
    this.updateNotificationScheduled = false;
    this.onPoolUpdated(this.getImages());
  };
}
