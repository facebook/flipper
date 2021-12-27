/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import UIKit
import FlipperKit

class CommunicationDemoViewController: UIViewController, UITableViewDataSource, FlipperKitExampleCommunicationResponderDelegate {
  @IBOutlet weak var messageField: UITextField!
  @IBOutlet weak var tableView: UITableView!
  var messageArray: [String] = []

  override func viewDidLoad() {
    super.viewDidLoad()
    FlipperKitExamplePlugin.sharedInstance()?.delegate = self
  }

  @IBAction func tappedTriggerNotification(_ sender: UIButton) {
  FlipperKitExamplePlugin.sharedInstance()?.triggerNotification();
  }

  @IBAction func tappedSendMessage(_ sender: UIButton) {
    if let message = self.messageField.text {
      FlipperKitExamplePlugin.sharedInstance()?.sendMessage(message);
    }
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "reusableCell", for: indexPath)
    cell.textLabel?.text = messageArray[indexPath.row]
    return cell
  }

  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return messageArray.count;
  }

  func messageReceived(_ msg: String!) {
    messageArray.append(msg)
    DispatchQueue.main.async { [weak self] in
      self?.tableView.reloadData();
    }
  }
}
