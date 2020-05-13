/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ImageId,
  ImageData,
  ImagesList,
  ImagesListResponse,
  ImageEvent,
  FrescoDebugOverlayEvent,
  AndroidCloseableReferenceLeakEvent,
  CacheInfo,
} from './api';
import {Fragment} from 'react';
import {ImagesMap} from './ImagePool';
import {MetricType, ReduxState} from 'flipper';
import React from 'react';
import ImagesCacheOverview from './ImagesCacheOverview';
import {
  FlipperPlugin,
  FlexRow,
  Text,
  DetailSidebar,
  colors,
  styled,
  isProduction,
  Notification,
  BaseAction,
} from 'flipper';
import ImagesSidebar from './ImagesSidebar';
import ImagePool from './ImagePool';

export type ImageEventWithId = ImageEvent & {eventId: number};

export type PersistedState = {
  surfaceList: Set<string>;
  images: ImagesList;
  events: Array<ImageEventWithId>;
  imagesMap: ImagesMap;
  closeableReferenceLeaks: Array<AndroidCloseableReferenceLeakEvent>;
  isLeakTrackingEnabled: boolean;
  nextEventId: number;
};

type PluginState = {
  selectedSurfaces: Set<string>;
  selectedImage: ImageId | null;
  isDebugOverlayEnabled: boolean;
  isAutoRefreshEnabled: boolean;
  images: ImagesList;
  coldStartFilter: boolean;
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

const debugLog = (...args: any[]) => {
  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

type ImagesMetaData = {
  levels: ImagesListResponse;
  events: Array<ImageEventWithId>;
  imageDataList: Array<ImageData>;
};

export default class FlipperImagesPlugin extends FlipperPlugin<
  PluginState,
  BaseAction,
  PersistedState
> {
  static defaultPersistedState: PersistedState = {
    images: [],
    events: [],
    imagesMap: {},
    surfaceList: new Set(),
    closeableReferenceLeaks: [],
    isLeakTrackingEnabled: false,
    nextEventId: 0,
  };

  static exportPersistedState = (
    callClient: (method: string, params?: any) => Promise<any>,
    persistedState: PersistedState,
    store?: ReduxState,
  ): Promise<PersistedState> => {
    const defaultPromise = Promise.resolve(persistedState);
    if (!persistedState) {
      persistedState = FlipperImagesPlugin.defaultPersistedState;
    }
    if (!store) {
      return defaultPromise;
    }
    return Promise.all([
      callClient('listImages'),
      callClient('getAllImageEventsInfo'),
    ]).then(async ([responseImages, responseEvents]) => {
      const levels: ImagesList = responseImages.levels;
      const events: Array<ImageEventWithId> = responseEvents.events;
      let pluginData: PersistedState = {
        ...persistedState,
        images: persistedState ? [...persistedState.images, ...levels] : levels,
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
          const surface = attribution[0] ? attribution[0].trim() : undefined;
          if (surface && surface.length > 0) {
            pluginData.surfaceList.add(surface);
          }
        }
        pluginData = {
          ...pluginData,
          events: [{...event, eventId: index}, ...pluginData.events],
        };
      });
      const idSet: Set<string> = levels.reduce((acc, level: CacheInfo) => {
        level.imageIds.forEach((id) => {
          acc.add(id);
        });
        return acc;
      }, new Set<string>());
      const imageDataList: Array<ImageData> = [];
      for (const id of idSet) {
        try {
          const imageData: ImageData = await callClient('getImage', {
            imageId: id,
          });
          imageDataList.push(imageData);
        } catch (e) {
          console.error(e);
        }
      }
      imageDataList.forEach((data: ImageData) => {
        const imagesMap = {...pluginData.imagesMap};
        imagesMap[data.imageId] = data;
        pluginData.imagesMap = imagesMap;
      });
      return pluginData;
    });
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    data: AndroidCloseableReferenceLeakEvent | ImageEvent,
  ): PersistedState => {
    if (method == 'closeable_reference_leak_event') {
      const event: AndroidCloseableReferenceLeakEvent = data as AndroidCloseableReferenceLeakEvent;
      return {
        ...persistedState,
        closeableReferenceLeaks: persistedState.closeableReferenceLeaks.concat(
          event,
        ),
      };
    } else if (method == 'events') {
      const event: ImageEvent = data as ImageEvent;
      debugLog('Received events', event);
      const {surfaceList} = persistedState;
      const {attribution} = event;
      if (attribution instanceof Array && attribution.length > 0) {
        const surface = attribution[0] ? attribution[0].trim() : undefined;
        if (surface && surface.length > 0) {
          surfaceList.add(surface);
        }
      }
      return {
        ...persistedState,
        events: [
          {eventId: persistedState.nextEventId, ...event},
          ...persistedState.events,
        ],
        nextEventId: persistedState.nextEventId + 1,
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
      .filter((_) => isLeakTrackingEnabled)
      .map((event: AndroidCloseableReferenceLeakEvent) => ({
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

  state: PluginState = {
    selectedSurfaces: new Set([surfaceDefaultText]),
    selectedImage: null,
    isDebugOverlayEnabled: false,
    isAutoRefreshEnabled: false,
    images: [],
    coldStartFilter: false,
  };
  imagePool: ImagePool | undefined;
  nextEventId: number = 1;

  filterImages = (
    images: ImagesList,
    events: Array<ImageEventWithId>,
    surfaces: Set<string>,
    coldStart: boolean,
  ): ImagesList => {
    if (!surfaces || (surfaces.has(surfaceDefaultText) && !coldStart)) {
      return images;
    }

    const imageList = images.map((image: CacheInfo) => {
      const imageIdList = image.imageIds.filter((imageID) => {
        const filteredEvents = events.filter((event: ImageEventWithId) => {
          const output =
            event.attribution &&
            event.attribution.length > 0 &&
            event.imageIds &&
            event.imageIds.includes(imageID);

          if (surfaces.has(surfaceDefaultText)) {
            return output && coldStart && event.coldStart;
          }

          return (
            (!coldStart || (coldStart && event.coldStart)) &&
            output &&
            surfaces.has(event.attribution[0])
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
    this.client.subscribe(
      'debug_overlay_event',
      (event: FrescoDebugOverlayEvent) => {
        this.setState({isDebugOverlayEnabled: event.enabled});
      },
    );
    this.imagePool = new ImagePool(this.getImage, (images: ImagesMap) =>
      this.props.setPersistedState({imagesMap: images}),
    );

    const images = this.filterImages(
      this.props.persistedState.images,
      this.props.persistedState.events,
      this.state.selectedSurfaces,
      this.state.coldStartFilter,
    );

    this.setState({images});
  }

  teardown() {
    this.imagePool ? this.imagePool.clear() : undefined;
  }

  updateImagesOnUI = (
    images: ImagesList,
    surfaces: Set<string>,
    coldStart: boolean,
  ) => {
    const filteredImages = this.filterImages(
      images,
      this.props.persistedState.events,
      surfaces,
      coldStart,
    );

    this.setState({
      selectedSurfaces: surfaces,
      images: filteredImages,
      coldStartFilter: coldStart,
    });
  };
  updateCaches = (reason: string) => {
    debugLog('Requesting images list (reason=' + reason + ')');
    this.client.call('listImages').then((response: ImagesListResponse) => {
      response.levels.forEach((data) =>
        this.imagePool ? this.imagePool.fetchImages(data.imageIds) : undefined,
      );
      this.props.setPersistedState({images: response.levels});
      this.updateImagesOnUI(
        this.props.persistedState.images,
        this.state.selectedSurfaces,
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
      this.imagePool ? this.imagePool._fetchCompleted(image) : undefined;
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
    const events = this.props.persistedState.events.filter((e) =>
      e.imageIds.includes(selectedImage),
    );
    return <ImagesSidebar image={maybeImage} events={events} />;
  };

  onSurfaceChange = (surfaces: Set<string>) => {
    this.updateImagesOnUI(
      this.props.persistedState.images,
      surfaces,
      this.state.coldStartFilter,
    );
  };

  onColdStartChange = (checked: boolean) => {
    this.updateImagesOnUI(
      this.props.persistedState.images,
      this.state.selectedSurfaces,
      checked,
    );
  };

  onTrackLeaks = (checked: boolean) => {
    this.props.logger.track('usage', 'fresco:onTrackLeaks', {enabled: checked});
    this.props.setPersistedState({
      isLeakTrackingEnabled: checked,
    });
  };

  render() {
    const options = [...this.props.persistedState.surfaceList].reduce(
      (acc, item) => {
        return [...acc, item];
      },
      [surfaceDefaultText],
    );
    let {selectedSurfaces} = this.state;

    if (selectedSurfaces.has(surfaceDefaultText)) {
      selectedSurfaces = new Set(options);
    }

    return (
      <React.Fragment>
        <ImagesCacheOverview
          allSurfacesOption={surfaceDefaultText}
          surfaceOptions={new Set(options)}
          selectedSurfaces={selectedSurfaces}
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
