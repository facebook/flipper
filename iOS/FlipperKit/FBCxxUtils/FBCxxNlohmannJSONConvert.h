// Copyright 2004-present Facebook. All Rights Reserved.
#pragma once

#import <Foundation/Foundation.h>

#include <nlohmann/json.hpp>

namespace facebook {
namespace cxxutils {
using json = nlohmann::json;
NSDictionary<NSString *, id> *convertNlohmannJSONToNSDictionary(const json &input);
}
}
