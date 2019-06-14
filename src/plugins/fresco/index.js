/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  ImageId,
  ImageData,
  ImagesList,
  ImagesListResponse,
  ImageEvent,
  FrescoDebugOverlayEvent,
  AndroidCloseableReferenceLeakEvent,
  CacheInfo,
} from './api.js';
import {Fragment} from 'react';
import type {ImagesMap} from './ImagePool.js';
import type {MetricType, MiddlewareAPI} from 'flipper';
import React from 'react';
import ImagesCacheOverview from './ImagesCacheOverview.js';
import {
  FlipperPlugin,
  FlexRow,
  Text,
  DetailSidebar,
  colors,
  styled,
  isProduction,
} from 'flipper';
import ImagesSidebar from './ImagesSidebar.js';
import ImagePool from './ImagePool.js';
import type {Notification} from '../../plugin';

export type ImageEventWithId = ImageEvent & {eventId: number};

export type PersistedState = {
  surfaceList: Set<string>,
  images: ImagesList,
  events: Array<ImageEventWithId>,
  imagesMap: ImagesMap,
  closeableReferenceLeaks: Array<AndroidCloseableReferenceLeakEvent>,
  isLeakTrackingEnabled: boolean,
};

type PluginState = {
  selectedSurface: string,
  selectedImage: ?ImageId,
  isDebugOverlayEnabled: boolean,
  isAutoRefreshEnabled: boolean,
  images: ImagesList,
  coldStartFilter: boolean,
};

const EmptySidebar = styled(FlexRow)({
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.light30,
  padding: 15,
  fontSize: 16,
});

export const InlineFlexRow = styled(FlexRow)({
  display: 'inline-block',
});

const surfaceDefaultText = 'SELECT ALL SURFACES';

const debugLog = (...args) => {
  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

type ImagesMetaData = {|
  levels: ImagesListResponse,
  events: Array<ImageEventWithId>,
  imageDataList: Array<ImageData>,
|};

export default class extends FlipperPlugin<PluginState, *, PersistedState> {
  static defaultPersistedState: PersistedState = {
    images: [],
    events: [],
    imagesMap: {},
    surfaceList: new Set(),
    closeableReferenceLeaks: [],
    isLeakTrackingEnabled: false,
  };

  static exportPersistedState = (
    callClient: (string, ?Object) => Promise<Object>,
    persistedState: ?PersistedState,
    store: ?MiddlewareAPI,
  ): Promise<?PersistedState> => {
    if (persistedState) {
      return Promise.resolve(persistedState);
    }
    const defaultPromise = Promise.resolve(persistedState);
    if (!store) {
      return defaultPromise;
    }
    return callClient('getAllImageData').then((data: ImagesMetaData) => {
      if (!data) {
        return;
      }
      const {levels, events, imageDataList} = data;
      let pluginData: PersistedState = {
        ...FlipperPlugin.defaultPersistedState,
        images: [...levels.levels],
        closeableReferenceLeaks:
          (persistedState && persistedState.closeableReferenceLeaks) || [],
      };

      events.forEach((event: ImageEventWithId, index) => {
        if (!event) {
          return;
        }
        const {attribution} = event;
        if (
          attribution &&
          attribution instanceof Array &&
          attribution.length > 0
        ) {
          const surface = attribution[0].trim();
          if (surface.length > 0) {
            pluginData.surfaceList.add(surface);
          }
        }
        pluginData = {
          ...pluginData,
          events: [{eventId: index, ...event}, ...pluginData.events],
        };
      });

      imageDataList.forEach((imageData: ImageData) => {
        const {imageId} = imageData;
        pluginData.imagesMap[imageId] = imageData;
      });
      return pluginData;
    });
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    data: Object,
  ): PersistedState => {
    if (method == 'closeable_reference_leak_event') {
      const event: AndroidCloseableReferenceLeakEvent = data;
      return {
        ...persistedState,
        closeableReferenceLeaks: persistedState.closeableReferenceLeaks.concat(
          event,
        ),
      };
    }

    return persistedState;
  };

  static metricsReducer = (
    persistedState: PersistedState,
  ): Promise<MetricType> => {
    const {events, imagesMap, closeableReferenceLeaks} = persistedState;

    const wastedBytes = (events || []).reduce((acc, event) => {
      const {viewport, imageIds} = event;
      if (!viewport) {
        return acc;
      }
      return imageIds.reduce((innerAcc, imageID) => {
        const imageData: ImageData = imagesMap[imageID];
        if (!imageData) {
          return innerAcc;
        }
        const imageWidth: number = imageData.width;
        const imageHeight: number = imageData.height;
        const viewPortWidth: number = viewport.width;
        const viewPortHeight: number = viewport.height;
        const viewPortArea = viewPortWidth * viewPortHeight;
        const imageArea = imageWidth * imageHeight;
        return innerAcc + Math.max(0, imageArea - viewPortArea);
      }, acc);
    }, 0);

    return Promise.resolve({
      WASTED_BYTES: wastedBytes,
      CLOSEABLE_REFERENCE_LEAKS: (closeableReferenceLeaks || []).length,
    });
  };

  static getActiveNotifications = ({
    closeableReferenceLeaks = [],
    isLeakTrackingEnabled = false,
  }: PersistedState): Array<Notification> =>
    closeableReferenceLeaks
      .filter(_ => isLeakTrackingEnabled)
      .map((event: AndroidCloseableReferenceLeakEvent, index) => ({
        id: event.identityHashCode,
        title: `Leaked CloseableReference: ${event.className}`,
        message: (
          <Fragment>
            <InlineFlexRow>
              CloseableReference leaked for{' '}
              <Text code={true}>{event.className}</Text>
              (identity hashcode: {event.identityHashCode}).
            </InlineFlexRow>
            <InlineFlexRow>
              <Text bold={true}>Stacktrace:</Text>
            </InlineFlexRow>
            <InlineFlexRow>
              <Text code={true}>{event.stacktrace || '<unavailable>'}</Text>
            </InlineFlexRow>
          </Fragment>
        ),
        severity: 'error',
        category: 'closeablereference_leak',
      }));

  state: PluginState;
  imagePool: ImagePool;
  nextEventId: number = 1;

  state = {
    selectedSurface: surfaceDefaultText,
    selectedImage: null,
    isDebugOverlayEnabled: false,
    isAutoRefreshEnabled: false,
    images: [],
    coldStartFilter: false,
  };

  filterImages = (
    images: ImagesList,
    events: Array<ImageEventWithId>,
    surface: string,
    coldStart: boolean,
  ): ImagesList => {
    if (!surface || (surface === surfaceDefaultText && !coldStart)) {
      return images;
    }
    const imageList = images.map((image: CacheInfo) => {
      const imageIdList = image.imageIds.filter(imageID => {
        const filteredEvents = events.filter((event: ImageEventWithId) => {
          const output =
            event.attribution &&
            event.attribution.length > 0 &&
            event.imageIds &&
            event.imageIds.includes(imageID);

          if (surface === surfaceDefaultText) {
            return output && coldStart && event.coldStart;
          }
          return (
            (!coldStart || (coldStart && event.coldStart)) &&
            output &&
            event.attribution[0] == surface
          );
        });
        return filteredEvents.length > 0;
      });
      return {...image, imageIds: imageIdList};
    });
    return imageList;
  };

  init() {
    debugLog('init()');
    this.updateCaches('init');
    this.client.subscribe('events', (event: ImageEvent) => {
      const {surfaceList} = this.props.persistedState;
      const {attribution} = event;
      if (attribution instanceof Array && attribution.length > 0) {
        const surface = attribution[0].trim();
        if (surface.length > 0) {
          surfaceList.add(surface);
        }
      }
      this.props.setPersistedState({
        events: [
          {eventId: this.nextEventId, ...event},
          ...this.props.persistedState.events,
        ],
      });
      this.nextEventId++;
    });
    this.client.subscribe(
      'debug_overlay_event',
      (event: FrescoDebugOverlayEvent) => {
        this.setState({isDebugOverlayEnabled: event.enabled});
      },
    );
    this.imagePool = new ImagePool(this.getImage, (images: ImagesMap) =>
      this.props.setPersistedState({imagesMap: images}),
    );

    let images = this.filterImages(
      this.props.persistedState.images,
      this.props.persistedState.events,
      this.state.selectedSurface,
      this.state.coldStartFilter,
    );
    this.setState({images});
  }

  teardown() {
    this.imagePool.clear();
  }

  updateImagesOnUI = (
    images: ImagesList,
    surface: string,
    coldStart: boolean,
  ) => {
    const filteredImages = this.filterImages(
      images,
      this.props.persistedState.events,
      surface,
      coldStart,
    );
    this.setState({
      selectedSurface: surface,
      images: filteredImages,
      coldStartFilter: coldStart,
    });
  };
  updateCaches = (reason: string) => {
    debugLog('Requesting images list (reason=' + reason + ')');
    this.client.call('listImages').then((response: ImagesListResponse) => {
      response.levels.forEach(data =>
        this.imagePool.fetchImages(data.imageIds),
      );
      this.props.setPersistedState({images: response.levels});
      this.updateImagesOnUI(
        this.props.persistedState.images,
        this.state.selectedSurface,
        this.state.coldStartFilter,
      );
    });
  };

  onClear = (type: string) => {
    this.client.call('clear', {type});
    setTimeout(() => this.updateCaches('onClear'), 1000);
  };

  onTrimMemory = () => {
    this.client.call('trimMemory', {});
    setTimeout(() => this.updateCaches('onTrimMemory'), 1000);
  };

  onEnableDebugOverlay = (enabled: boolean) => {
    this.client.call('enableDebugOverlay', {enabled});
  };

  onEnableAutoRefresh = (enabled: boolean) => {
    this.setState({isAutoRefreshEnabled: enabled});
    if (enabled) {
      // Delay the call just enough to allow the state change to complete.
      setTimeout(() => this.onAutoRefresh());
    }
  };

  onAutoRefresh = () => {
    this.updateCaches('auto-refresh');
    if (this.state.isAutoRefreshEnabled) {
      setTimeout(() => this.onAutoRefresh(), 1000);
    }
  };

  getImage = (imageId: string) => {
    debugLog('<- getImage requested for ' + imageId);
    this.client.call('getImage', {imageId}).then((image: ImageData) => {
      debugLog('-> getImage ' + imageId + ' returned');
      this.imagePool._fetchCompleted(image);
    });
  };

  onImageSelected = (selectedImage: ImageId) => this.setState({selectedImage});

  renderSidebar = () => {
    const {selectedImage} = this.state;

    if (selectedImage == null) {
      return (
        <EmptySidebar grow={true}>
          <Text align="center">
            Select an image to see the events associated with it.
          </Text>
        </EmptySidebar>
      );
    }

    const maybeImage = this.props.persistedState.imagesMap[selectedImage];
    const events = this.props.persistedState.events.filter(e =>
      e.imageIds.includes(selectedImage),
    );
    return <ImagesSidebar image={maybeImage} events={events} />;
  };

  onSurfaceChange = (surface: string) => {
    this.updateImagesOnUI(
      this.props.persistedState.images,
      surface,
      this.state.coldStartFilter,
    );
  };

  onColdStartChange = (checked: boolean) => {
    this.updateImagesOnUI(
      this.props.persistedState.images,
      this.state.selectedSurface,
      checked,
    );
  };

  onTrackLeaks = (checked: boolean) => {
    this.props.setPersistedState({
      isLeakTrackingEnabled: checked,
    });
  };

  render() {
    const options = [...this.props.persistedState.surfaceList].reduce(
      (acc, item) => {
        return {...acc, [item]: item};
      },
      {[surfaceDefaultText]: surfaceDefaultText},
    );
    return (
      <React.Fragment>
        <ImagesCacheOverview
          surfaceOptions={options}
          selectedSurface={this.state.selectedSurface}
          onChangeSurface={this.onSurfaceChange}
          coldStartFilter={this.state.coldStartFilter}
          onColdStartChange={this.onColdStartChange}
          images={this.state.images}
          onClear={this.onClear}
          onTrimMemory={this.onTrimMemory}
          onRefresh={() => this.updateCaches('refresh')}
          onEnableDebugOverlay={this.onEnableDebugOverlay}
          onEnableAutoRefresh={this.onEnableAutoRefresh}
          isDebugOverlayEnabled={this.state.isDebugOverlayEnabled}
          isAutoRefreshEnabled={this.state.isAutoRefreshEnabled}
          onImageSelected={this.onImageSelected}
          imagesMap={this.props.persistedState.imagesMap}
          events={this.props.persistedState.events}
          isLeakTrackingEnabled={
            this.props.persistedState.isLeakTrackingEnabled
          }
          onTrackLeaks={this.onTrackLeaks}
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </React.Fragment>
    );
  }
}
