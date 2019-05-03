//
//  ViewController.swift
//  Tutorial
//
//  Created by Pritesh Nandgaonkar on 5/2/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import UIKit

class ViewController: UIViewController, UITableViewDataSource {
  let marineMammals: [MarineMammal] = [
    MarineMammal(name: "Polar Bear", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ursus_maritimus_4_1996-08-04.jpg/190px-Ursus_maritimus_4_1996-08-04.jpg")!),
    MarineMammal(name: "Sea Otter", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sea_otter_cropped.jpg/220px-Sea_otter_cropped.jpg")!),
    MarineMammal(name: "West Indian Manatee", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FL_fig04.jpg/230px-FL_fig04.jpg")!),
    MarineMammal(name: "Bottlenose Dolphin", image: URL(string: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/220px-Tursiops_truncatus_01.jpg")!),
  ]
  
  
  override func viewDidLoad() {
    super.viewDidLoad()
  }
  
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return marineMammals.count
  }
  
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "MarineMammalCell", for: indexPath)
    guard let mammalCell = cell as? MarineMammalCell else {
      fatalError("Wrong cell identifier")
    }
    mammalCell.populate(marineMammal: marineMammals[indexPath.row])
    return mammalCell
  }  
}

