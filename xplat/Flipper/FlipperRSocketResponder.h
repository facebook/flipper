/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
#include <rsocket/RSocketResponder.h>

namespace facebook {
namespace flipper {

class FlipperConnectionManagerImpl;

class FlipperRSocketResponder : public rsocket::RSocketResponder {
 private:
  FlipperConnectionManagerImpl* websocket_;

 public:
  FlipperRSocketResponder(FlipperConnectionManagerImpl* websocket)
      : websocket_(websocket){};

  void handleFireAndForget(
      rsocket::Payload request,
      rsocket::StreamId streamId);

  std::shared_ptr<yarpl::single::Single<rsocket::Payload>>
  handleRequestResponse(rsocket::Payload request, rsocket::StreamId streamId);
};

} // namespace flipper
} // namespace facebook
