/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CacheInfo, ImageId, ImageData, ImagesList} from './api';
import {ImageEventWithId} from './index';

import {styled, Layout, Toolbar, theme} from 'flipper-plugin';
import {
  Button,
  Switch,
  Empty,
  Skeleton,
  Typography,
  Image,
  Row,
  Col,
  Badge,
} from 'antd';
import MultipleSelect from './MultipleSelect';
import {ImagesMap} from './ImagePool';
import React, {PureComponent} from 'react';
import {DeleteFilled} from '@ant-design/icons';

function formatMB(bytes: number) {
  return Math.floor(bytes / (1024 * 1024)) + 'MB';
}

function formatKB(bytes: number) {
  return Math.floor(bytes / 1024) + 'KB';
}

type ToggleProps = {
  label: string;
  onClick?: (newValue: boolean) => void;
  toggled: boolean;
};

function Toggle(props: ToggleProps) {
  return (
    <>
      <Switch
        onClick={() => {
          props.onClick && props.onClick(!props.toggled);
        }}
        checked={props.toggled}
      />
      <Typography.Text>{props.label}</Typography.Text>
    </>
  );
}

type ImagesCacheOverviewProps = {
  onColdStartChange: (checked: boolean) => void;
  coldStartFilter: boolean;
  allSurfacesOption: string;
  surfaceOptions: Set<string>;
  selectedSurfaces: Set<string>;
  onChangeSurface: (key: Set<string>) => void;
  images: ImagesList;
  onClear: (type: string) => void;
  onTrimMemory: () => void;
  onRefresh: () => void;
  onEnableDebugOverlay: (enabled: boolean) => void;
  isDebugOverlayEnabled: boolean;
  onEnableAutoRefresh: (enabled: boolean) => void;
  isAutoRefreshEnabled: boolean;
  onImageSelected: (selectedImage: ImageId) => void;
  imagesMap: ImagesMap;
  events: Array<ImageEventWithId>;
  onTrackLeaks: (enabled: boolean) => void;
  isLeakTrackingEnabled: boolean;
  onShowDiskImages: (enabled: boolean) => void;
  showDiskImages: boolean;
};

type ImagesCacheOverviewState = {
  selectedImage: ImageId | null;
  size: number;
};

export default class ImagesCacheOverview extends PureComponent<
  ImagesCacheOverviewProps,
  ImagesCacheOverviewState
> {
  state = {
    selectedImage: null,
    size: 150,
  };

  onImageSelected = (selectedImage: ImageId) => {
    this.setState({selectedImage});
    this.props.onImageSelected(selectedImage);
  };

  onEnableDebugOverlayToggled = () => {
    this.props.onEnableDebugOverlay(!this.props.isDebugOverlayEnabled);
  };

  onEnableAutoRefreshToggled = () => {
    this.props.onEnableAutoRefresh(!this.props.isAutoRefreshEnabled);
  };

  onSurfaceOptionsChange = (selectedItem: string, checked: boolean) => {
    const {allSurfacesOption, surfaceOptions} = this.props;
    const selectedSurfaces = new Set([...this.props.selectedSurfaces]);

    if (checked && selectedItem === allSurfacesOption) {
      this.props.onChangeSurface(surfaceOptions);

      return;
    }

    if (!checked && selectedSurfaces.size === 1) {
      return;
    }

    if (selectedItem !== allSurfacesOption) {
      selectedSurfaces.delete(allSurfacesOption);

      if (checked) {
        selectedSurfaces.add(selectedItem);
      } else {
        selectedSurfaces.delete(selectedItem);
      }
    }

    if (
      surfaceOptions.size - selectedSurfaces.size === 1 &&
      !selectedSurfaces.has(allSurfacesOption)
    ) {
      selectedSurfaces.add(allSurfacesOption);
    }

    this.props.onChangeSurface(selectedSurfaces);
  };

  render() {
    const hasImages =
      this.props.images.reduce(
        (c, cacheInfo) => c + cacheInfo.imageIds.length,
        0,
      ) > 0;

    return (
      <Layout.Top>
        <Toolbar>
          <Button
            icon={<DeleteFilled></DeleteFilled>}
            onClick={this.props.onTrimMemory}>
            Trim Memory
          </Button>
          <Button onClick={this.props.onRefresh}>Refresh</Button>
          <MultipleSelect
            selected={this.props.selectedSurfaces}
            options={this.props.surfaceOptions}
            onChange={this.onSurfaceOptionsChange}
            label="Surfaces"
          />
          <Toggle
            onClick={this.onEnableAutoRefreshToggled}
            toggled={this.props.isAutoRefreshEnabled}
            label="Auto Refresh"
          />
          <Toggle
            onClick={this.onEnableDebugOverlayToggled}
            toggled={this.props.isDebugOverlayEnabled}
            label="Show Debug Overlay"
          />
          <Toggle
            toggled={this.props.coldStartFilter}
            onClick={this.props.onColdStartChange}
            label="Show Cold Start Images"
          />
          <Toggle
            toggled={this.props.isLeakTrackingEnabled}
            onClick={this.props.onTrackLeaks}
            label="Track Leaks"
          />
          <Toggle
            toggled={this.props.showDiskImages}
            onClick={this.props.onShowDiskImages}
            label="Show Disk Images"
          />
        </Toolbar>
        {!hasImages ? (
          <Layout.Container pad>
            <Empty />
          </Layout.Container>
        ) : (
          <Layout.ScrollContainer>
            {this.props.images.map((data: CacheInfo, index: number) => {
              const maxSize = data.maxSizeBytes;
              const subtitle = maxSize
                ? formatMB(data.sizeBytes) + ' / ' + formatMB(maxSize)
                : formatMB(data.sizeBytes);
              const onClear =
                data.clearKey !== undefined
                  ? () => this.props.onClear(data.clearKey as string)
                  : undefined;
              return (
                <ImageGrid
                  key={index}
                  title={data.cacheType}
                  subtitle={subtitle}
                  images={data.imageIds}
                  onImageSelected={this.onImageSelected}
                  selectedImage={this.state.selectedImage}
                  imagesMap={this.props.imagesMap}
                  events={this.props.events}
                  onClear={onClear}
                />
              );
            })}
          </Layout.ScrollContainer>
        )}
      </Layout.Top>
    );
  }
}

class ImageGrid extends PureComponent<{
  title: string;
  subtitle: string;
  images: Array<ImageId>;
  selectedImage: ImageId | null;
  onImageSelected: (image: ImageId) => void;
  onClear: (() => void) | undefined;
  imagesMap: ImagesMap;
  events: Array<ImageEventWithId>;
}> {
  static Content = styled.div({
    paddingLeft: 15,
  });

  render() {
    const {images, onImageSelected, selectedImage} = this.props;

    if (images.length === 0) {
      return null;
    }

    const ROW_SIZE = 6;
    const imageRows = Array(Math.ceil(images.length / ROW_SIZE))
      .fill(0)
      .map((_, index) => index * ROW_SIZE)
      .map((begin) => images.slice(begin, begin + ROW_SIZE));

    return (
      <Layout.Container gap>
        <ImageGridHeader
          key="header"
          title={this.props.title}
          subtitle={this.props.subtitle}
          onClear={this.props.onClear}
        />

        <Layout.Container pad>
          {imageRows.map((row, rowIndex) => (
            <Layout.Container pad key={rowIndex}>
              <Row key={rowIndex} align={'middle'} gutter={[8, 24]}>
                {row.map((imageId, colIndex) => (
                  <Col key={colIndex} span={24 / ROW_SIZE}>
                    <ImageItem
                      imageId={imageId}
                      image={this.props.imagesMap[imageId]}
                      key={imageId}
                      selected={
                        selectedImage != null && selectedImage === imageId
                      }
                      onSelected={onImageSelected}
                      numberOfRequests={
                        this.props.events.filter((e) =>
                          e.imageIds.includes(imageId),
                        ).length
                      }
                    />
                  </Col>
                ))}
              </Row>
            </Layout.Container>
          ))}
        </Layout.Container>
      </Layout.Container>
    );
  }
}

class ImageGridHeader extends PureComponent<{
  title: string;
  subtitle: string;
  onClear: (() => void) | undefined;
}> {
  static Subtitle = styled.span({
    fontSize: 22,
    fontWeight: 300,
  });

  render() {
    return (
      <Layout.Horizontal gap pad grow borderBottom>
        <Typography.Title>{this.props.title}</Typography.Title>
        <ImageGridHeader.Subtitle>
          {this.props.subtitle}
        </ImageGridHeader.Subtitle>

        {this.props.onClear ? (
          <Button onClick={this.props.onClear}>Clear Cache</Button>
        ) : null}
      </Layout.Horizontal>
    );
  }
}

class ImageItem extends PureComponent<{
  imageId: ImageId;
  image: ImageData;
  selected: boolean;
  onSelected: (image: ImageId) => void;
  size: number;
  numberOfRequests: number;
}> {
  static defaultProps = {
    size: 150,
  };

  static SelectedHighlight = styled.div<{selected: boolean}>((props) => ({
    borderColor: theme.primaryColor,
    borderStyle: 'solid',
    borderWidth: props.selected ? 3 : 0,
    borderRadius: 4,
    boxShadow: props.selected ? `inset 0 0 0 1px ${theme.white}` : 'none',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  }));

  static HoverOverlay = styled(Layout.Container)<{
    selected: boolean;
    size: number;
  }>((props) => ({
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    bottom: props.selected ? 4 : 0,
    fontSize: props.size > 100 ? 16 : 11,
    justifyContent: 'center',
    left: props.selected ? 4 : 0,
    opacity: 0,
    position: 'absolute',
    right: props.selected ? 4 : 0,
    top: props.selected ? 4 : 0,
    overflow: 'hidden',
    transition: '.1s opacity',
    '&:hover': {
      opacity: 1,
    },
  }));

  static MemoryLabel = styled.span({
    fontWeight: 600,
    marginBottom: 6,
  });

  static SizeLabel = styled.span({
    fontWeight: 300,
  });

  static EventBadge = styled(Badge)({
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  });

  onClick = () => {
    this.props.onSelected(this.props.imageId);
  };

  render() {
    const {image, selected, size, numberOfRequests} = this.props;

    return (
      <Layout.Container onClick={this.onClick} gap>
        {numberOfRequests > 0 && image != null && (
          <ImageItem.EventBadge count={numberOfRequests}></ImageItem.EventBadge>
        )}
        {image != null ? (
          <Image src={image.data} preview={false} />
        ) : (
          <Skeleton.Image />
        )}
        <ImageItem.SelectedHighlight selected={selected} />
        {image != null && (
          <ImageItem.HoverOverlay selected={selected} size={size}>
            <ImageItem.MemoryLabel>
              {formatKB(image.sizeBytes)}
            </ImageItem.MemoryLabel>
            <ImageItem.SizeLabel>
              {image.width}&times;{image.height}
            </ImageItem.SizeLabel>
          </ImageItem.HoverOverlay>
        )}
      </Layout.Container>
    );
  }
}
