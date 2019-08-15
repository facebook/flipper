// Copyright 2004-present Facebook. All Rights Reserved.

#import "FBCxxNlohmannJSONConvert.h"

#import <objc/runtime.h>

namespace facebook {
namespace cxxutils {
using json = nlohmann::json;

id convertJSONValue(const json &input);
NSString *convertToNSString(const std::string &input);

id convertJSONValue(const json &input)

{
  // for reference see
  // [github](https://github.com/nlohmann/json/blob/8d6c033f80461123cbfba5e7a3027a9c35ea2eef/include/nlohmann/detail/value_t.hpp#L41)
  using value_t = json::value_t;

  switch (input.type()) {
    case value_t::string: {
      return convertToNSString(input.get<std::string>());
    }
    case value_t::object:
      return convertNlohmannJSONToNSDictionary(input);
    case value_t::array: {
      NSMutableArray<id> *array = [[NSMutableArray alloc] initWithCapacity:input.size()];
      for (auto &elem : input) {
        id obj = convertJSONValue(elem);
        if (obj) {
          [array addObject:obj];
        }
      }
      return array;
    }
    case value_t::boolean:
      return input.get<bool>() ? @YES : @NO;
    case value_t::number_integer:
      return @(input.get<int>());
    case value_t::number_unsigned:
      return @(input.get<uint>());
    case value_t::number_float:
      return @(input.get<float>());
    case value_t::null:
    case value_t::discarded:
      return [NSNull null];
  }
}

NSString *convertToNSString(const std::string &str)
{
  return [[NSString alloc] initWithBytes:str.c_str() length:str.size() encoding:NSUTF8StringEncoding];
}

NSDictionary<NSString *, id> *convertNlohmannJSONToNSDictionary(const json &input)
{
  NSMutableDictionary<NSString *, id> *result = [NSMutableDictionary new];

  for (auto &el : input.items()) {
    const auto key = convertToNSString(el.key());
    id value = convertJSONValue(el.value());
    if (value) {
      result[key] = value;
    }
  }

  return [result copy];
}
}
}
