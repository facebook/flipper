//
//  MyFlipperPlugin.swift
//  Tutorial
//
//  Created by Pritesh Nandgaonkar on 5/3/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation
import FlipperKit

class SeaMammalsPlugin: NSObject, FlipperPlugin {
  var connection: FlipperConnection? = nil
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
    connection = nil;
  }
}
