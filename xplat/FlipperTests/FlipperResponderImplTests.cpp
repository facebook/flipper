/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
#include <Flipper/FlipperResponderImpl.h>
#include "yarpl/Flowable.h"
#include "yarpl/Single.h"
#include "yarpl/single/SingleTestObserver.h"

#include <folly/json.h>
#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

using folly::dynamic;

TEST(FlipperResponderImplTest, testSuccessWrapper) {
  auto dynamicSingle =
      yarpl::single::Single<folly::dynamic>::create([](auto observer) mutable {
        observer->onSubscribe(yarpl::single::SingleSubscriptions::empty());
        auto responder = std::make_shared<FlipperResponderImpl>(observer);
        responder->success(folly::dynamic::object("my", "object"));
      });
  auto to = yarpl::single::SingleTestObserver<folly::dynamic>::create();
  dynamicSingle->subscribe(to);

  to->awaitTerminalEvent();
  auto output = to->getOnSuccessValue();
  EXPECT_EQ(output["success"]["my"], "object");
}

TEST(FlipperResponderImplTest, testErrorWrapper) {
  auto dynamicSingle =
      yarpl::single::Single<folly::dynamic>::create([](auto observer) mutable {
        observer->onSubscribe(yarpl::single::SingleSubscriptions::empty());
        auto responder = std::make_shared<FlipperResponderImpl>(observer);
        responder->error(folly::dynamic::object("my", "object"));
      });
  auto to = yarpl::single::SingleTestObserver<folly::dynamic>::create();
  dynamicSingle->subscribe(to);

  to->awaitTerminalEvent();
  auto output = to->getOnSuccessValue();
  EXPECT_EQ(output["error"]["my"], "object");
}

} // namespace test
} // namespace flipper
} // namespace facebook
