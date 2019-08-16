// Copyright 2004-present Facebook. All Rights Reserved.
#pragma once

#import <Foundation/Foundation.h>

#include <folly/dynamic.h>

namespace facebook {
namespace cxxutils {

folly::dynamic convertIdToFollyDynamic(id json, bool nullifyNanAndInf = false);
id convertFollyDynamicToId(const folly::dynamic &dyn);

} }
