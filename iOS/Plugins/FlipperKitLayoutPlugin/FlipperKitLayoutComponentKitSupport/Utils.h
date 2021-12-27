/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKFlexboxComponent.h>

NSString* relativeDimension(CKRelativeDimension dimension);
NSDictionary<NSString*, NSString*>* flexboxRect(CKFlexboxSpacing spacing);
CKRelativeDimension relativeStructDimension(NSString* dimension);
NSDictionary<NSString*, NSString*>* ckcomponentSize(CKComponentSize size);
