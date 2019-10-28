/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation
import UIKit

struct MarineMammal {
  let name: String
  let image: URL
  static let defaultList: [MarineMammal] = [
    MarineMammal(name: "Polar Bear", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ursus_maritimus_4_1996-08-04.jpg/190px-Ursus_maritimus_4_1996-08-04.jpg")!),
    MarineMammal(name: "Sea Otter", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sea_otter_cropped.jpg/220px-Sea_otter_cropped.jpg")!),
    MarineMammal(name: "West Indian Manatee", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FL_fig04.jpg/230px-FL_fig04.jpg")!),
    MarineMammal(name: "Bottlenose Dolphin", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/220px-Tursiops_truncatus_01.jpg")!),
  ]
}

class MarineMammalCell: UITableViewCell {
  
  @IBOutlet weak var photo: UIImageView!
  @IBOutlet weak var name: UILabel!
  
  func populate(marineMammal: MarineMammal) {
    let task = URLSession.shared.dataTask(with: marineMammal.image) { [weak self] (data, response, error) in
      if let unwrappedError = error {
        print(unwrappedError)
        return
      }
      
      guard let unwrappedData = data else {
        print("No Image data received")
        return
      }
      let image = UIImage(data: unwrappedData)
      
      guard let unwrappedImage = image else {
        print("Failed to instantiate an image from Image data")
        return
      }
      DispatchQueue.main.async {
        self?.photo.image = unwrappedImage
      }
    }
    task.resume()
    self.name.text = marineMammal.name
  }
}

