/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import UIKit

class UserDefaultsViewController: UIViewController {

    @IBOutlet weak var keyTextField: UITextField!
    @IBOutlet weak var valueTextField: UITextField!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
    }

    @IBAction func tappedSave(_ sender: Any) {
        UserDefaults.standard.set(self.valueTextField.text ?? "", forKey: self.keyTextField.text ?? "")
    }

}
