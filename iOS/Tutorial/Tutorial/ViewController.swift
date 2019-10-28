/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import UIKit

class ViewController: UIViewController, UITableViewDataSource {
  let marineMammals: [MarineMammal] = MarineMammal.defaultList
  
  
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

