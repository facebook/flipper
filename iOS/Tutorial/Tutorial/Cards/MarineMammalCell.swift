//
//  MarineMammalCell.swift
//  Tutorial
//
//  Created by Pritesh Nandgaonkar on 5/2/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation
import UIKit

struct MarineMammal {
  let name: String
  let image: URL
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

