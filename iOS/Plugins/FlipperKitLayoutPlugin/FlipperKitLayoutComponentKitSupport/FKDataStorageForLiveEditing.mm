/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FKDataStorageForLiveEditing.h"
#import <ComponentKit/CKComponentScopeTypes.h>
#import <mutex>

@implementation FKDataStorageForLiveEditing {
  std::unordered_map<CKTreeNodeIdentifier, id> _data;
  std::mutex _mutex;
}

- (void)setData:(id)value
    forTreeNodeIdentifier:(CKTreeNodeIdentifier)treeNodeIdentifier {
  std::lock_guard<std::mutex> lock(_mutex);
  _data[treeNodeIdentifier] = value;
}

- (id)dataForTreeNodeIdentifier:(CKTreeNodeIdentifier)treeNodeIdentifier {
  std::lock_guard<std::mutex> lock(_mutex);
  return (_data.count(treeNodeIdentifier) ? _data[treeNodeIdentifier] : nil);
}

@end
