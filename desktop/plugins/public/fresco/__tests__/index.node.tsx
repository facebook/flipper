/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FrescoPlugin from '../index';
import {PersistedState, ImageEventWithId} from '../index';
import {AndroidCloseableReferenceLeakEvent} from '../api';
import {Notification} from 'flipper';
import {ImagesMap} from '../ImagePool';

type ScanDisplayTime = {[scan_number: number]: number};

function mockPersistedState(
  imageSizes: Array<{
    width: number;
    height: number;
  }> = [],
  viewport: {
    width: number;
    height: number;
  } = {width: 150, height: 150},
): PersistedState {
  const scanDisplayTime: ScanDisplayTime = {};
  scanDisplayTime[1] = 3;
  const events: Array<ImageEventWithId> = [
    {
      imageIds: [...Array(imageSizes.length).keys()].map(String),
      eventId: 0,
      attribution: [],
      startTime: 1,
      endTime: 2,
      source: 'source',
      coldStart: true,
      viewport: {...viewport, scanDisplayTime},
    },
  ];

  const imagesMap = imageSizes.reduce((acc, val, index) => {
    acc[index] = {
      imageId: String(index),
      width: val.width,
      height: val.height,
      sizeBytes: 10,
      data: 'undefined',
    };
    return acc;
  }, {} as ImagesMap);

  return {
    surfaceList: new Set(),
    images: [],
    events,
    imagesMap,
    closeableReferenceLeaks: [],
    isLeakTrackingEnabled: false,
    nextEventId: 0,
    showDiskImages: false,
  };
}

test('notifications for leaks', () => {
  const notificationReducer: (
    persistedState: PersistedState,
  ) => Array<Notification> = FrescoPlugin.getActiveNotifications;
  const closeableReferenceLeaks: Array<AndroidCloseableReferenceLeakEvent> = [
    {
      identityHashCode: 'deadbeef',
      className: 'com.facebook.imagepipeline.memory.NativeMemoryChunk',
      stacktrace: null,
    },
    {
      identityHashCode: 'f4c3b00c',
      className: 'com.facebook.flipper.SomeMemoryAbstraction',
      stacktrace: null,
    },
  ];
  const persistedStateWithoutTracking = {
    ...mockPersistedState(),
    closeableReferenceLeaks,
    isLeakTrackingEnabled: false,
  };
  const emptyNotifs = notificationReducer(persistedStateWithoutTracking);
  expect(emptyNotifs).toHaveLength(0);

  const persistedStateWithTracking = {
    ...mockPersistedState(),
    closeableReferenceLeaks,
    isLeakTrackingEnabled: true,
  };
  const notifs = notificationReducer(persistedStateWithTracking);
  expect(notifs).toHaveLength(2);
  expect(notifs[0].message).toMatchSnapshot();
  expect(notifs[1].title).toContain('SomeMemoryAbstraction');
});
