/*
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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
