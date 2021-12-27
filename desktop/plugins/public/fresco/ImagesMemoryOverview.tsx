/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ImagesList, ImagesMap} from './api';

import {Layout} from 'flipper-plugin';
import {Empty} from 'antd';

import React, {PureComponent} from 'react';

// @ts-ignore
import {Treemap, TreemapPoint} from 'react-vis';

import {toKB, formatMB, formatKB} from './ImagesCacheOverview';

type ImagesMemoryOverviewProps = {
  images: ImagesList;
  imagesMap: ImagesMap;
};

const DISK_IMAGES = 'Disk images';

const CACHES_TO_DISPLAY = new Set([
  'On screen bitmaps',
  'Bitmap memory cache',
  DISK_IMAGES,
]);

const STYLE = {
  stroke: 'white',
  strokeWidth: '1px',
  strokeOpacity: 0.25,
};

export default class ImagesMemoryOverview extends PureComponent<ImagesMemoryOverviewProps> {
  nodeLabel = (size: number, cache: string) => {
    if (cache == DISK_IMAGES) {
      return '';
    }
    const sizeKb = toKB(size);
    if (sizeKb < 100) {
      return '';
    } else if (sizeKb < 1000) {
      return formatKB(size);
    } else {
      return formatMB(size);
    }
  };

  filterCachesToDisplay = (images: ImagesList) => {
    return images.filter((cacheInfo) =>
      CACHES_TO_DISPLAY.has(cacheInfo.cacheType),
    );
  };

  freeSpaceNodes = () => {
    const imagesList: ImagesList = [];
    this.filterCachesToDisplay(this.props.images).forEach((cache) => {
      if (cache.maxSizeBytes) {
        imagesList.push({
          cacheType: 'Free space - ' + cache.cacheType,
          sizeBytes: cache.maxSizeBytes - cache.sizeBytes,
          imageIds: [],
        });
      }
    });
    return imagesList;
  };

  constructTreemapData = () => {
    return {
      title: '',
      size: 0,
      style: STYLE,
      children: this.filterCachesToDisplay(this.props.images)
        .concat(this.freeSpaceNodes())
        .map((cacheInfo) => {
          return {
            size: toKB(cacheInfo.sizeBytes),
            style: STYLE,
            title:
              cacheInfo.cacheType + ' (' + formatMB(cacheInfo.sizeBytes) + ')',
            value: toKB(cacheInfo.sizeBytes),
            children: cacheInfo.imageIds
              .filter((imageId) => this.props.imagesMap[imageId] != null)
              .map((imageId) => {
                const image = this.props.imagesMap[imageId];
                return {
                  size: toKB(image.sizeBytes),
                  style: STYLE,
                  title: this.nodeLabel(image.sizeBytes, cacheInfo.cacheType),
                  value: toKB(image.sizeBytes),
                  children: [],
                };
              }),
          };
        }),
    };
  };

  render() {
    const hasImages =
      this.props.images.reduce(
        (c, cacheInfo) => c + cacheInfo.imageIds.length,
        0,
      ) > 0;

    return (
      <Layout.ScrollContainer>
        {!hasImages ? (
          <Layout.Container pad>
            <Empty />
          </Layout.Container>
        ) : (
          <Treemap
            {...{
              animation: true,
              colorType: 'literal',
              colorRange: ['#88572C'],
              data: this.constructTreemapData(),
              mode: 'resquarify',
              renderMode: 'SVG',
              padding: 30,
              height: 900,
              width: 900,
              margin: 15,
              hideRootNode: true,
              getSize: (d: TreemapPoint) => d.value,
              getColor: (d: TreemapPoint) => d.hex,
              style: STYLE,
            }}
          />
        )}
      </Layout.ScrollContainer>
    );
  }
}
