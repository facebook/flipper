/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

enum {
  SKPortForwardingFrameTypeOpenPipe = 201,
  SKPortForwardingFrameTypeWriteToPipe = 202,
  SKPortForwardingFrameTypeClosePipe = 203,
};

static dispatch_data_t NSDataToGCDData(NSData *data) {
  __block NSData *retainedData = data;
  return dispatch_data_create(data.bytes, data.length, nil, ^{
    retainedData = nil;
  });
}
