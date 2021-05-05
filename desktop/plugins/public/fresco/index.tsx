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
import {PluginClient, createState, usePlugin, useValue} from 'flipper-plugin';
import React from 'react';
import ImagesCacheOverview from './ImagesCacheOverview';
import {
  FlexRow,
  Text,
  DetailSidebar,
  colors,
  styled,
  isProduction,
} from 'flipper';
import ImagesSidebar from './ImagesSidebar';
import ImagePool from './ImagePool';

export type ImageEventWithId = ImageEvent & {eventId: number};
export type AllImageEventsInfo = {
  events: Array<ImageEventWithId>;
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

type Methods = {
  getAllImageEventsInfo(params: {}): Promise<AllImageEventsInfo>;
  listImages(params: {showDiskImages: boolean}): Promise<ImagesListResponse>;
  getImage(params: {imageId: string}): Promise<ImageData>;
  clear(params: {type: string}): Promise<void>;
  trimMemory(params: {}): Promise<void>;
  enableDebugOverlay(params: {enabled: boolean}): Promise<void>;
};

type Events = {
  closeable_reference_leak_event: AndroidCloseableReferenceLeakEvent;
  events: ImageEvent;
  debug_overlay_event: FrescoDebugOverlayEvent;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const selectedSurfaces = createState<Set<string>>(
    new Set([surfaceDefaultText]),
  );
  const currentSelectedImage = createState<ImageId | null>(null);
  const isDebugOverlayEnabled = createState<boolean>(false);
  const isAutoRefreshEnabled = createState<boolean>(false);
  const currentImages = createState<ImagesList>([]);
  const coldStartFilter = createState<boolean>(false);
  const imagePool = createState<ImagePool | null>(null);

  const surfaceList = createState<Set<string>>(new Set(), {
    persist: 'surfaceList',
  });
  const images = createState<ImagesList>([], {persist: 'images'});
  const events = createState<Array<ImageEventWithId>>([], {persist: 'events'});
  const imagesMap = createState<ImagesMap>({}, {persist: 'imagesMap'});
  const isLeakTrackingEnabled = createState<boolean>(false, {
    persist: 'isLeakTrackingEnabled',
  });
  const showDiskImages = createState<boolean>(false, {
    persist: 'showDiskImages',
  });
  const nextEventId = createState<number>(0, {persist: 'nextEventId'});

  client.onConnect(() => {
    init();
  });

  client.onDestroy(() => {
    imagePool?.get()?.clear();
  });

  client.onMessage('closeable_reference_leak_event', (event) => {
    if (isLeakTrackingEnabled) {
      client.showNotification({
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
      });
    }
  });

  client.onExport(async () => {
    const [responseImages, responseEvents] = await Promise.all([
      client.send('listImages', {showDiskImages: showDiskImages.get()}),
      client.send('getAllImageEventsInfo', {}),
    ]);
    const levels: ImagesList = responseImages.levels;
    const newEvents: Array<ImageEventWithId> = responseEvents.events;

    images.set([...images.get(), ...levels]);

    newEvents.forEach((event: ImageEventWithId, index) => {
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
          surfaceList.set(new Set([...surfaceList.get(), surface]));
        }
      }
      events.set([{...event, eventId: index}, ...events.get()]);
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
        const imageData: ImageData = await client.send('getImage', {
          imageId: id,
        });
        imageDataList.push(imageData);
      } catch (e) {
        console.error(e);
      }
    }

    const imagesMapCopy = {...imagesMap.get()};
    imageDataList.forEach((data: ImageData) => {
      imagesMapCopy[data.imageId] = data;
    });
    imagesMap.set(imagesMapCopy);
  });

  client.onMessage('debug_overlay_event', (event) => {
    isDebugOverlayEnabled.set(event.enabled);
  });

  client.onMessage('events', (event) => {
    debugLog('Received events', event);
    const {attribution} = event;
    if (attribution instanceof Array && attribution.length > 0) {
      const surface = attribution[0] ? attribution[0].trim() : undefined;
      if (surface && surface.length > 0) {
        surfaceList.update((draft) => (draft = new Set([...draft, surface])));
      }
    }
    events.update((draft) => {
      draft.unshift({
        eventId: nextEventId.get(),
        ...event,
      });
    });

    nextEventId.set(nextEventId.get() + 1);
  });

  function onClear(type: string) {
    client.send('clear', {type});
    setTimeout(() => updateCaches('onClear'), 1000);
  }

  function onTrimMemory() {
    client.send('trimMemory', {});
    setTimeout(() => updateCaches('onTrimMemory'), 1000);
  }

  function onEnableDebugOverlay(enabled: boolean) {
    client.send('enableDebugOverlay', {enabled});
  }

  function onEnableAutoRefresh(enabled: boolean) {
    isAutoRefreshEnabled.set(enabled);

    if (enabled) {
      // Delay the call just enough to allow the state change to complete.
      setTimeout(() => onAutoRefresh());
    }
  }

  function onAutoRefresh() {
    updateCaches('auto-refresh');
    if (isAutoRefreshEnabled.get()) {
      setTimeout(() => onAutoRefresh(), 1000);
    }
  }

  function getImage(imageId: string) {
    if (!client.isConnected) {
      debugLog(`Cannot fetch image ${imageId}: disconnected`);
      return;
    }
    debugLog('<- getImage requested for ' + imageId);
    client.send('getImage', {imageId}).then((image: ImageData) => {
      debugLog('-> getImage ' + imageId + ' returned');
      imagePool.get()?._fetchCompleted(image);
    });
  }

  function onImageSelected(selectedImage: ImageId) {
    currentSelectedImage.set(selectedImage);
  }

  function onSurfaceChange(surfaces: Set<string>) {
    updateImagesOnUI(images.get(), surfaces, coldStartFilter.get());
  }

  function onColdStartChange(checked: boolean) {
    updateImagesOnUI(images.get(), selectedSurfaces.get(), checked);
  }

  function onTrackLeaks(checked: boolean) {
    client.logger.track('usage', 'fresco:onTrackLeaks', {
      enabled: checked,
    });

    isLeakTrackingEnabled.set(checked);
  }

  function onShowDiskImages(checked: boolean) {
    client.logger.track('usage', 'fresco:onShowDiskImages', {
      enabled: checked,
    });

    showDiskImages.set(checked);
    updateCaches('refresh');
  }

  function init() {
    debugLog('init()');
    if (client.isConnected) {
      updateCaches('init');
    } else {
      debugLog(`not connected)`);
    }
    imagePool.set(
      new ImagePool(getImage, (images: ImagesMap) => imagesMap.set(images)),
    );

    const filteredImages = filterImages(
      images.get(),
      events.get(),
      selectedSurfaces.get(),
      coldStartFilter.get(),
    );

    images.set(filteredImages);
  }

  function filterImages(
    images: ImagesList,
    events: Array<ImageEventWithId>,
    surfaces: Set<string>,
    coldStart: boolean,
  ): ImagesList {
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
  }

  function updateImagesOnUI(
    newImages: ImagesList,
    surfaces: Set<string>,
    coldStart: boolean,
  ) {
    const filteredImages = filterImages(
      newImages,
      events.get(),
      surfaces,
      coldStart,
    );

    selectedSurfaces.set(surfaces);
    images.set(filteredImages);
    coldStartFilter.set(coldStart);
  }

  function updateCaches(reason: string) {
    debugLog('Requesting images list (reason=' + reason + ')');
    client
      .send('listImages', {
        showDiskImages: showDiskImages.get(),
      })
      .then((response: ImagesListResponse) => {
        response.levels.forEach((data) =>
          imagePool?.get()?.fetchImages(data.imageIds),
        );
        images.set(response.levels);
        updateImagesOnUI(
          images.get(),
          selectedSurfaces.get(),
          coldStartFilter.get(),
        );
      });
  }

  return {
    selectedSurfaces,
    currentSelectedImage,
    isDebugOverlayEnabled,
    isAutoRefreshEnabled,
    currentImages,
    coldStartFilter,
    surfaceList,
    images,
    events,
    imagesMap,
    isLeakTrackingEnabled,
    showDiskImages,
    nextEventId,
    imagePool,
    onSurfaceChange,
    onColdStartChange,
    onClear,
    onTrimMemory,
    updateCaches,
    onEnableDebugOverlay,
    onEnableAutoRefresh,
    onImageSelected,
    onTrackLeaks,
    onShowDiskImages,
  };
}

export function Component() {
  const instance = usePlugin(plugin);

  let selectedSurfaces = useValue(instance.selectedSurfaces);
  const isDebugOverlayEnabled = useValue(instance.isDebugOverlayEnabled);
  const isAutoRefreshEnabled = useValue(instance.isAutoRefreshEnabled);
  const coldStartFilter = useValue(instance.coldStartFilter);

  const surfaceList = useValue(instance.surfaceList);
  const images = useValue(instance.images);
  const events = useValue(instance.events);
  const imagesMap = useValue(instance.imagesMap);
  const isLeakTrackingEnabled = useValue(instance.isLeakTrackingEnabled);
  const showDiskImages = useValue(instance.showDiskImages);

  const options = [...surfaceList].reduce(
    (acc, item) => {
      return [...acc, item];
    },
    [surfaceDefaultText],
  );

  if (selectedSurfaces.has(surfaceDefaultText)) {
    selectedSurfaces = new Set(options);
  }

  return (
    <React.Fragment>
      <ImagesCacheOverview
        allSurfacesOption={surfaceDefaultText}
        surfaceOptions={new Set(options)}
        selectedSurfaces={selectedSurfaces}
        onChangeSurface={instance.onSurfaceChange}
        coldStartFilter={coldStartFilter}
        onColdStartChange={instance.onColdStartChange}
        images={images}
        onClear={instance.onClear}
        onTrimMemory={instance.onTrimMemory}
        onRefresh={() => instance.updateCaches('refresh')}
        onEnableDebugOverlay={instance.onEnableDebugOverlay}
        onEnableAutoRefresh={instance.onEnableAutoRefresh}
        isDebugOverlayEnabled={isDebugOverlayEnabled}
        isAutoRefreshEnabled={isAutoRefreshEnabled}
        onImageSelected={instance.onImageSelected}
        imagesMap={imagesMap}
        events={events}
        isLeakTrackingEnabled={isLeakTrackingEnabled}
        onTrackLeaks={instance.onTrackLeaks}
        showDiskImages={showDiskImages}
        onShowDiskImages={instance.onShowDiskImages}
      />
      <DetailSidebar>
        <Sidebar />
      </DetailSidebar>
    </React.Fragment>
  );
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const events = useValue(instance.events);
  const imagesMap = useValue(instance.imagesMap);
  const currentSelectedImage = useValue(instance.currentSelectedImage);

  if (currentSelectedImage == null) {
    return (
      <EmptySidebar grow={true}>
        <Text align="center">
          Select an image to see the events associated with it.
        </Text>
      </EmptySidebar>
    );
  }

  const maybeImage = imagesMap[currentSelectedImage];
  const filteredEvents = events.filter((e) =>
    e.imageIds.includes(currentSelectedImage),
  );
  return <ImagesSidebar image={maybeImage} events={filteredEvents} />;
}
