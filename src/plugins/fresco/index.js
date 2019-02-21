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

type PluginState = {
  images: ImagesList,
  isDebugOverlayEnabled: boolean,
  isAutoRefreshEnabled: boolean,
  events: Array<ImageEventWithId>,
  imagesMap: ImagesMap,
  selectedImage: ?ImageId,
};

const EmptySidebar = styled(FlexRow)({
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.light30,
  padding: 15,
  fontSize: 16,
});

const DEBUG = false;

export default class extends FlipperPlugin<PluginState> {
  state: PluginState;
  imagePool: ImagePool;
  nextEventId: number = 1;

  state = {
    images: [],
    events: [],
    selectedImage: null,
    isDebugOverlayEnabled: false,
    isAutoRefreshEnabled: false,
    imagesMap: {},
  };

  init() {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('init()');
    }
    this.updateCaches('init');
    this.client.subscribe('events', (event: ImageEvent) => {
      this.setState({
        events: [{eventId: this.nextEventId, ...event}, ...this.state.events],
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
      this.setState({imagesMap: images}),
    );
  }

  teardown() {
    this.imagePool.clear();
  }

  updateCaches = (reason: string) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('Requesting images list (reason=' + reason + ')');
    }
    this.client.call('listImages').then((response: ImagesListResponse) => {
      response.levels.forEach(data =>
        this.imagePool.fetchImages(data.imageIds),
      );
      this.setState({images: response.levels});
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

    const maybeImage = this.state.imagesMap[selectedImage];
    const events = this.state.events.filter(e =>
      e.imageIds.includes(selectedImage),
    );
    return <ImagesSidebar image={maybeImage} events={events} />;
  };

  render() {
    return (
      <React.Fragment>
        <ImagesCacheOverview
          images={this.state.images}
          onClear={this.onClear}
          onTrimMemory={this.onTrimMemory}
          onRefresh={() => this.updateCaches('refresh')}
          onEnableDebugOverlay={this.onEnableDebugOverlay}
          onEnableAutoRefresh={this.onEnableAutoRefresh}
          isDebugOverlayEnabled={this.state.isDebugOverlayEnabled}
          isAutoRefreshEnabled={this.state.isAutoRefreshEnabled}
          onImageSelected={this.onImageSelected}
          imagesMap={this.state.imagesMap}
          events={this.state.events}
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </React.Fragment>
    );
  }
}
