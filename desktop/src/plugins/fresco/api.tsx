/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type ImageId = string;

// Listing images

export type CacheInfo = {
  cacheType: string;
  clearKey?: string; // set this if this cache level supports clear(<key>)
  sizeBytes: number;
  maxSizeBytes?: number;
  imageIds: Array<ImageId>;
};

export type ImagesList = Array<CacheInfo>;

// The iOS Flipper api does not support a top-level array, so we wrap it in an object
export type ImagesListResponse = {
  levels: ImagesList;
};

// listImages() -> ImagesListResponse

// Getting details on a specific image

export type ImageBytes = string;

export type ImageData = {
  imageId: ImageId;
  uri?: string;
  width: number;
  height: number;
  sizeBytes: number;
  data: ImageBytes;
  surface?: string;
};

// getImage({imageId: string}) -> ImageData

// Subscribing to image events (requests and prefetches)

export type Timestamp = number;

export type ViewportData = {
  width: number;
  height: number;
  scanDisplayTime: {[scan_number: number]: Timestamp};
};

export type ImageEvent = {
  imageIds: Array<ImageId>;
  attribution: Array<string>;
  startTime: Timestamp;
  endTime: Timestamp;
  source: string;
  coldStart: boolean;
  viewport?: ViewportData; // not set for prefetches
};

// Misc

export type FrescoDebugOverlayEvent = {
  enabled: boolean;
};

export type AndroidCloseableReferenceLeakEvent = {
  identityHashCode: string;
  className: string;
  stacktrace: string | null;
};
