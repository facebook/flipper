/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import FrescoPlugin from '../index.js';
import type {PersistedState, ImageEventWithId} from '../index.js';
import type {AndroidCloseableReferenceLeakEvent} from '../api.js';
import type {MetricType} from 'flipper';

function mockPersistedState(
  imageSizes: Array<{
    width: number,
    height: number,
  }> = [],
  viewport: {
    width: number,
    height: number,
  } = {width: 150, height: 150},
): PersistedState {
  const scanDisplayTime = {};
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
      data: undefined,
    };
    return acc;
  }, {});

  return {
    surfaceList: new Set(),
    images: [],
    events,
    imagesMap,
    closeableReferenceLeaks: [],
  };
}

test('the metric reducer for the input having regression', () => {
  const persistedState = mockPersistedState(
    [
      {
        width: 150,
        height: 150,
      },
      {
        width: 150,
        height: 150,
      },
      {
        width: 150,
        height: 150,
      },
    ],
    {
      width: 100,
      height: 100,
    },
  );
  expect(FrescoPlugin.metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = FrescoPlugin.metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({
    WASTED_BYTES: 37500,
  });
});

test('the metric reducer for the input having no regression', () => {
  const persistedState = mockPersistedState(
    [
      {
        width: 50,
        height: 10,
      },
      {
        width: 50,
        height: 50,
      },
      {
        width: 50,
        height: 50,
      },
    ],
    {
      width: 100,
      height: 100,
    },
  );
  const metricsReducer = FrescoPlugin.metricsReducer;
  expect(metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({
    WASTED_BYTES: 0,
  });
});

test('the metric reducer for the default persisted state', () => {
  const metricsReducer = FrescoPlugin.metricsReducer;
  expect(metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = metricsReducer(FrescoPlugin.defaultPersistedState);
  expect(metrics).resolves.toMatchObject({WASTED_BYTES: 0});
});

test('the metric reducer with the events data but with no imageData in imagesMap ', () => {
  const persistedState = mockPersistedState(
    [
      {
        width: 50,
        height: 10,
      },
      {
        width: 50,
        height: 50,
      },
      {
        width: 50,
        height: 50,
      },
    ],
    {
      width: 100,
      height: 100,
    },
  );
  persistedState.imagesMap = {};
  const metricsReducer = FrescoPlugin.metricsReducer;
  expect(metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({WASTED_BYTES: 0});
});

test('the metric reducer with the no viewPort data in events', () => {
  const persistedState = mockPersistedState(
    [
      {
        width: 50,
        height: 10,
      },
      {
        width: 50,
        height: 50,
      },
      {
        width: 50,
        height: 50,
      },
    ],
    {
      width: 100,
      height: 100,
    },
  );
  delete persistedState.events[0].viewport;
  const metricsReducer = FrescoPlugin.metricsReducer;
  expect(metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({WASTED_BYTES: 0});
});

test('the metric reducer with the multiple events', () => {
  const scanDisplayTime = {};
  scanDisplayTime[1] = 3;
  const events: Array<ImageEventWithId> = [
    {
      imageIds: ['0', '1'],
      eventId: 0,
      attribution: [],
      startTime: 1,
      endTime: 2,
      source: 'source',
      coldStart: true,
      viewport: {width: 100, height: 100, scanDisplayTime},
    },
    {
      imageIds: ['2', '3'],
      eventId: 1,
      attribution: [],
      startTime: 1,
      endTime: 2,
      source: 'source',
      coldStart: true,
      viewport: {width: 50, height: 50, scanDisplayTime},
    },
  ];
  const imageSizes = [
    {
      width: 150,
      height: 150,
    },
    {
      width: 100,
      height: 100,
    },
    {
      width: 250,
      height: 250,
    },
    {
      width: 300,
      height: 300,
    },
  ];
  const imagesMap = imageSizes.reduce((acc, val, index) => {
    acc[index] = {
      imageId: String(index),
      width: val.width,
      height: val.height,
      sizeBytes: 10,
      data: undefined,
    };
    return acc;
  }, {});
  const persistedState = {
    surfaceList: new Set(),
    images: [],
    events,
    imagesMap,
  };
  const metricsReducer = FrescoPlugin.metricsReducer;
  expect(metricsReducer).toBeDefined();
  //$FlowFixMe: Added a check if the metricsReducer exists in FrescoPlugin
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({WASTED_BYTES: 172500});
});

test('closeable reference metrics on empty state', () => {
  const metricsReducer: (
    persistedState: PersistedState,
  ) => Promise<MetricType> = (FrescoPlugin.metricsReducer: any);
  const persistedState = mockPersistedState();
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({CLOSEABLE_REFERENCE_LEAKS: 0});
});

test('closeable reference metrics on input', () => {
  const metricsReducer: (
    persistedState: PersistedState,
  ) => Promise<MetricType> = (FrescoPlugin.metricsReducer: any);
  const closeableReferenceLeaks: Array<AndroidCloseableReferenceLeakEvent> = [
    {
      identityHashCode: 'deadbeef',
      className: 'com.facebook.imagepipeline.memory.NativeMemoryChunk',
    },
    {
      identityHashCode: 'f4c3b00c',
      className: 'com.facebook.flipper.SomeMemoryAbstraction',
    },
  ];
  const persistedState = {
    ...mockPersistedState(),
    closeableReferenceLeaks,
  };
  const metrics = metricsReducer(persistedState);
  expect(metrics).resolves.toMatchObject({CLOSEABLE_REFERENCE_LEAKS: 2});
});
