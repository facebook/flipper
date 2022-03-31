// @lint-ignore-every LICENSELINT
/*
 * The file was derived from FLEXNetworkObserver.h.
 * All modifications to the original source are licensed under:
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//
//  FLEXNetworkObserver.h
//  Derived from:
//
//  PDAFNetworkDomainController.h
//  PonyDebugger
//
//  Created by Mike Lewis on 2/27/12.
//
//  Licensed to Square, Inc. under one or more contributor license agreements.
//  See the LICENSE file distributed with this work for the terms under
//  which Square, Inc. licenses this file to you.
//

// PonyDebugger Copyright 2012 Square Inc.
// Licensed under the Apache License,
// Version 2.0(the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#import <Foundation/Foundation.h>

FOUNDATION_EXTERN NSString* const
    kSKFLEXNetworkObserverEnabledStateChangedNotification;

/// This class swizzles NSURLConnection and NSURLSession delegate methods to
/// observe events in the URL loading system. High level network events are sent
/// to the default SKFLEXNetworkRecorder instance which maintains the request
/// history and caches response bodies.
@interface SKFLEXNetworkObserver : NSObject

+ (void)start;

@end
