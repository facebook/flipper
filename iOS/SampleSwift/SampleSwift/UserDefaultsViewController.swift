//
//  UserDefaultsViewController.swift
//  SampleSwift
//
//  Created by Marc Terns on 10/7/18.
//  Copyright © 2018 Noah Gilmore. All rights reserved.
//

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
