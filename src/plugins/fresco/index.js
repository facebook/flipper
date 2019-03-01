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
  CacheInfo,
} from './api.js';
import type {ImagesMap} from './ImagePool.js';

import React from 'react';
import ImagesCacheOverview from './ImagesCacheOverview.js';
import {
  FlipperPlugin,
  FlexRow,
  Text,
  DetailSidebar,
  colors,
  styled,
} from 'flipper';
import ImagesSidebar from './ImagesSidebar.js';
import ImagePool from './ImagePool.js';

export type ImageEventWithId = ImageEvent & {eventId: number};

type PersistedState = {
  surfaceList: Set<string>,
  images: ImagesList,
  events: Array<ImageEventWithId>,
  imagesMap: ImagesMap,
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

const DEBUG = false;
const surfaceDefaultText = 'SELECT ALL SURFACES';

export default class extends FlipperPlugin<PluginState, *, PersistedState> {
  static defaultPersistedState: PersistedState = {
    images: [],
    events: [],
    imagesMap: {},
    surfaceList: new Set(),
  };

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

  init() {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('init()');
    }
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
  }

  teardown() {
    this.imagePool.clear();
  }

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
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('Requesting images list (reason=' + reason + ')');
    }
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
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('<- getImage requested for ' + imageId);
    }
    this.client.call('getImage', {imageId}).then((image: ImageData) => {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log('-> getImage ' + imageId + ' returned');
      }
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
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </React.Fragment>
    );
  }
}
