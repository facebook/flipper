/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <Flipper/FlipperLogger.h>
#include <gtest/gtest.h>
#include <memory>

namespace facebook {
namespace flipper {
namespace test {

class FlippeLoggerTest : public ::testing::Test {};

TEST_F(FlippeLoggerTest, push_and_get_within_capacity) {
  CircularContainer<int> buffer(5);
  for (int i = 1; i <= 3; ++i) {
    buffer.push_back(i);
  }

  std::vector<int> elements = buffer.get();
  EXPECT_EQ(elements.size(), 3);
  EXPECT_EQ(elements[0], 1);
  EXPECT_EQ(elements[1], 2);
  EXPECT_EQ(elements[2], 3);
}

TEST_F(FlippeLoggerTest, push_and_get_beyond_capacity) {
  CircularContainer<int> buffer(5);
  for (int i = 1; i <= 8; ++i) {
    buffer.push_back(i);
  }

  std::vector<int> elements = buffer.get();
  EXPECT_EQ(elements.size(), 5);
  EXPECT_EQ(elements[0], 4);
  EXPECT_EQ(elements[1], 5);
  EXPECT_EQ(elements[2], 6);
  EXPECT_EQ(elements[3], 7);
  EXPECT_EQ(elements[4], 8);
}

TEST_F(FlippeLoggerTest, access) {
  CircularContainer<int> buffer(5);
  for (int i = 1; i <= 5; ++i) {
    buffer.push_back(i);
  }

  EXPECT_EQ(buffer[0], 1);
  EXPECT_EQ(buffer[1], 2);
  EXPECT_EQ(buffer[2], 3);
  EXPECT_EQ(buffer[3], 4);
  EXPECT_EQ(buffer[4], 5);
}

TEST_F(FlippeLoggerTest, access_empty) {
  CircularContainer<int> buffer(5);
  EXPECT_EQ(buffer[0], 0);
}

TEST_F(FlippeLoggerTest, access_beyond_capacity) {
  CircularContainer<int> buffer(5);
  for (int i = 1; i <= 3; ++i) {
    buffer.push_back(i);
  }

  EXPECT_EQ(buffer[3], 0);
}

} // namespace test
} // namespace flipper
} // namespace facebook
