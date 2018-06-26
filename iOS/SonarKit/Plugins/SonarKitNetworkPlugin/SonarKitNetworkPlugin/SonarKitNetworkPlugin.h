/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED
#import <Foundation/Foundation.h>

#import <SonarKit/SonarPlugin.h>

#import "SKBufferingPlugin.h"
#import "SKNetworkReporter.h"
#import "SKDispatchQueue.h"

@interface SonarKitNetworkPlugin : SKBufferingPlugin <SKNetworkReporterDelegate>

- (instancetype)initWithNetworkAdapter:(id<SKNetworkAdapterDelegate>)adapter NS_DESIGNATED_INITIALIZER;
- (instancetype)initWithNetworkAdapter:(id<SKNetworkAdapterDelegate>)adapter queue:(const std::shared_ptr<facebook::sonar::DispatchQueue> &)queue; //For test purposes

@property (strong, nonatomic) id<SKNetworkAdapterDelegate> adapter;

@end

#endif
