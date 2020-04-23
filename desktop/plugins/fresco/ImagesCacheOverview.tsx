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

import {
  Toolbar,
  Button,
  Spacer,
  colors,
  FlexBox,
  FlexRow,
  FlexColumn,
  LoadingIndicator,
  styled,
  Select,
  ToggleButton,
  Text,
} from 'flipper';
import MultipleSelect from './MultipleSelect';
import {ImagesMap} from './ImagePool';
import {clipboard} from 'electron';
import React, {ChangeEvent, KeyboardEvent, PureComponent} from 'react';

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

const ToolbarToggleButton = styled(ToggleButton)(() => ({
  alignSelf: 'center',
  marginRight: 4,
  minWidth: 30,
}));

const ToggleLabel = styled(Text)(() => ({
  whiteSpace: 'nowrap',
}));

function Toggle(props: ToggleProps) {
  return (
    <>
      <ToolbarToggleButton
        onClick={() => {
          props.onClick && props.onClick(!props.toggled);
        }}
        toggled={props.toggled}
      />
      <ToggleLabel>{props.label}</ToggleLabel>
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
};

type ImagesCacheOverviewState = {
  selectedImage: ImageId | null;
  size: number;
};

const StyledSelect = styled(Select)((props) => ({
  marginLeft: 6,
  marginRight: 6,
  height: '100%',
  maxWidth: 164,
}));

export default class ImagesCacheOverview extends PureComponent<
  ImagesCacheOverviewProps,
  ImagesCacheOverviewState
> {
  state = {
    selectedImage: null,
    size: 150,
  };

  static Container = styled(FlexColumn)({
    backgroundColor: colors.white,
  });

  static Content = styled(FlexColumn)({
    flex: 1,
    overflow: 'auto',
  });

  static Empty = styled(FlexBox)({
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  });

  onImageSelected = (selectedImage: ImageId) => {
    this.setState({selectedImage});
    this.props.onImageSelected(selectedImage);
  };

  onKeyDown = (e: KeyboardEvent) => {
    const selectedImage = this.state.selectedImage;
    const imagesMap = this.props.imagesMap;

    if (selectedImage) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        clipboard.writeText(String(imagesMap[selectedImage]));
        e.preventDefault();
      }
    }
  };

  onEnableDebugOverlayToggled = () => {
    this.props.onEnableDebugOverlay(!this.props.isDebugOverlayEnabled);
  };

  onEnableAutoRefreshToggled = () => {
    this.props.onEnableAutoRefresh(!this.props.isAutoRefreshEnabled);
  };

  onChangeSize = (e: ChangeEvent<HTMLInputElement>) =>
    this.setState({size: parseInt(e.target.value, 10)});

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
      <ImagesCacheOverview.Container
        grow={true}
        onKeyDown={this.onKeyDown}
        tabIndex={0}>
        <Toolbar position="top">
          <Button icon="trash" onClick={this.props.onTrimMemory}>
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
          <Spacer />
          <input
            type="range"
            onChange={this.onChangeSize}
            min={50}
            max={150}
            value={this.state.size}
          />
        </Toolbar>
        {!hasImages ? (
          <ImagesCacheOverview.Empty>
            <LoadingIndicator size={50} />
          </ImagesCacheOverview.Empty>
        ) : (
          <ImagesCacheOverview.Content>
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
                  size={this.state.size}
                  events={this.props.events}
                  onClear={onClear}
                />
              );
            })}
          </ImagesCacheOverview.Content>
        )}
      </ImagesCacheOverview.Container>
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
  size: number;
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

    return (
      <>
        <ImageGridHeader
          key="header"
          title={this.props.title}
          subtitle={this.props.subtitle}
          onClear={this.props.onClear}
        />
        <ImageGrid.Content key="content">
          {images.map((imageId) => (
            <ImageItem
              imageId={imageId}
              image={this.props.imagesMap[imageId]}
              key={imageId}
              selected={selectedImage != null && selectedImage === imageId}
              onSelected={onImageSelected}
              size={this.props.size}
              numberOfRequests={
                this.props.events.filter((e) => e.imageIds.includes(imageId))
                  .length
              }
            />
          ))}
        </ImageGrid.Content>
      </>
    );
  }
}

class ImageGridHeader extends PureComponent<{
  title: string;
  subtitle: string;
  onClear: (() => void) | undefined;
}> {
  static Container = styled(FlexRow)({
    color: colors.dark70,
    paddingTop: 10,
    paddingBottom: 10,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 15,
    borderBottom: `1px solid ${colors.light10}`,
    flexShrink: 0,
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    zIndex: 3,
  });

  static Heading = styled.span({
    fontSize: 22,
    fontWeight: 600,
  });

  static Subtitle = styled.span({
    fontSize: 22,
    fontWeight: 300,
    marginLeft: 15,
  });

  static ClearButton = styled(Button)({
    alignSelf: 'center',
    height: 30,
    marginLeft: 'auto',
    width: 100,
  });

  render() {
    return (
      <ImageGridHeader.Container>
        <ImageGridHeader.Heading>{this.props.title}</ImageGridHeader.Heading>
        <ImageGridHeader.Subtitle>
          {this.props.subtitle}
        </ImageGridHeader.Subtitle>
        <Spacer />
        {this.props.onClear ? (
          <ImageGridHeader.ClearButton onClick={this.props.onClear}>
            Clear Cache
          </ImageGridHeader.ClearButton>
        ) : null}
      </ImageGridHeader.Container>
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
  static Container = styled(FlexBox)<{size: number}>((props) => ({
    float: 'left',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    height: props.size,
    width: props.size,
    borderRadius: 4,
    marginRight: 15,
    marginBottom: 15,
    backgroundColor: colors.light02,
  }));

  static Image = styled.img({
    borderRadius: 4,
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  });

  static Loading = styled.span({
    padding: '0 0',
  });

  static SelectedHighlight = styled.div<{selected: boolean}>((props) => ({
    borderColor: colors.highlight,
    borderStyle: 'solid',
    borderWidth: props.selected ? 3 : 0,
    borderRadius: 4,
    boxShadow: props.selected ? `inset 0 0 0 1px ${colors.white}` : 'none',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  }));

  static HoverOverlay = styled(FlexColumn)<{selected: boolean; size: number}>(
    (props) => ({
      alignItems: 'center',
      backgroundColor: colors.whiteAlpha80,
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
    }),
  );

  static MemoryLabel = styled.span({
    fontWeight: 600,
    marginBottom: 6,
  });

  static SizeLabel = styled.span({
    fontWeight: 300,
  });

  static Events = styled.div({
    position: 'absolute',
    top: -5,
    right: -5,
    color: colors.white,
    backgroundColor: colors.highlight,
    fontWeight: 600,
    borderRadius: 10,
    fontSize: '0.85em',
    zIndex: 2,
    lineHeight: '20px',
    width: 20,
    textAlign: 'center',
  });

  static defaultProps = {
    size: 150,
  };

  onClick = () => {
    this.props.onSelected(this.props.imageId);
  };

  render() {
    const {image, selected, size, numberOfRequests} = this.props;

    return (
      <ImageItem.Container onClick={this.onClick} size={size}>
        {numberOfRequests > 0 && image != null && (
          <ImageItem.Events>{numberOfRequests}</ImageItem.Events>
        )}
        {image != null ? (
          <ImageItem.Image src={image.data} />
        ) : (
          <LoadingIndicator size={25} />
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
      </ImageItem.Container>
    );
  }
}
