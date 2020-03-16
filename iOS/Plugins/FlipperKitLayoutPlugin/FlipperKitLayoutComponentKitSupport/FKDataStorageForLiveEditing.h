/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <ComponentKit/CKTreeNodeTypes.h>

/** DataStorage uses to map global IDs of nodes to data which we want to store
to prodice live editing*/
@interface FKDataStorageForLiveEditing : NSObject

- (id)dataForTreeNodeIdentifier:(CKTreeNodeIdentifier)treeNodeIdentifier;
- (void)setData:(id)value
    forTreeNodeIdentifier:(CKTreeNodeIdentifier)treeNodeIdentifier;

@end
