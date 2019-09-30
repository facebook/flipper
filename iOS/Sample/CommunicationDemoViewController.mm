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

#import "CommunicationDemoViewController.h"
#import <FlipperKitExamplePlugin/FlipperKitExamplePlugin.h>

@interface CommunicationDemoViewController()<FlipperKitExampleCommunicationResponderDelegate>
@property (strong, nonatomic) NSMutableArray<NSString *> *messagesToDisplay;
@property (weak, nonatomic) IBOutlet UITextField *messageTextField;
@property (weak, nonatomic) IBOutlet UITableView *tableView;
@end

@implementation CommunicationDemoViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [FlipperKitExamplePlugin sharedInstance].delegate = self;
}

- (IBAction)tappedTriggerNotification:(UIButton *)sender {
    [[FlipperKitExamplePlugin sharedInstance] triggerNotification];
}

- (IBAction)tappedSendMessage:(UIButton *)sender {
    if (self.messageTextField.text.length > 0) {
        [[FlipperKitExamplePlugin sharedInstance] sendMessage:self.messageTextField.text];
    }
}

- (nonnull UITableViewCell *)tableView:(nonnull UITableView *)tableView cellForRowAtIndexPath:(nonnull NSIndexPath *)indexPath {
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"reusableCell"];
    cell.textLabel.text = self.messagesToDisplay[indexPath.row];
    return cell;
}

- (NSInteger)tableView:(nonnull UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return self.messagesToDisplay.count;
}

- (void)messageReceived:(NSString *)msg {
    if (msg) {
        if (!self.messagesToDisplay) {
            self.messagesToDisplay = @[].mutableCopy;
        }
        [self.messagesToDisplay addObject:msg];
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.tableView reloadData];
        });
    }
}

@end
