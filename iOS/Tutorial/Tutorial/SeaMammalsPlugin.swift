/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import FlipperKit
import Foundation

class SeaMammalsPlugin: NSObject, FlipperPlugin {
  var connection: FlipperConnection?
  let mammals: [MarineMammal]

  init(_ marineMammals: [MarineMammal]) {
    mammals = marineMammals
  }

  func identifier() -> String! {
    return "sea-mammals"
  }

  func didConnect(_ connection: FlipperConnection!) {
    self.connection = connection
    for (index, mammal) in mammals.enumerated() {
      connection.send("newRow", withParams: ["id": index, "title": mammal.name, "url": mammal.image.absoluteString])
    }
  }

  func didDisconnect() {
    connection = nil
  }
}
