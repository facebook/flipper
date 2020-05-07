---
id: supporting-layout
title: Implementing Layout Inspection
---

To enable the Flipper layout inspector on a new platform, just implement a client plugin with id `Inspector` which implements the following interface:

Note that we're using [Flow](https://flow.org/en/docs/types/objects/) syntax to specify this JSON API.

### Node
```
type NodeId = string;

type InspectorValue = {
  __type__: 'auto' | 'text' | 'number' | 'boolean' | 'enum' | 'color',
  __mutable__: boolean,
  value: number | string | boolean,
};

type Node = {
  id: NodeId,
  name: string,
  data: ?{string: Object},
  children: Array<NodeId>,
  attributes: ?Array<{name: string, value: string}>,
  decoration: ?string,
};
```

Node is the core data type of the layout inspector. The Flipper desktop plugin visualizes a tree of nodes with associated data and attributes. Any UI or data model which can be modeled as a tree of nodes can be inspected using the layout inspector. Data associated with the nodes can also be edited.

`id` is a stable globally unique node identifier.

`name` is the user facing identifier for this node. It does not need to be unique. Typically the class name of the node is used as the node's name.

`data` is a set of named JSON objects representing data associated with the node. This data will be rendered as immutable by default, to the user of the plugin but can be made mutable by wrapping any value in a InspectorValue with the `__mutable__` attribute set to true.

InspectorValue can also be used to change the parsed type of the value, such as parsing a number as a color to show the value in a color picker.

`children` is a list of identifiers pointing to children of this node. This is a list of identifiers instead of a list of nodes to allow nodes to be lazily fetched and instantiated.

`attributes` is a list of key:value pairs which are displayed alongside the name in the layout inspector.

`decoration` is a string identifying the optional icon used to decorate a node in the layout inspector. Adding new decoration options requires adding an icon file to the Sonar desktop app. Currently componentkit and litho decorations are supported.

### Plugin Interface

```
interface ClientLayoutPlugin {
  Node getRoot();
  GetNodesResponse getNodes({ids: Array<NodeId>});
  GetAllNodesResponse getAllNodes();
  void setData({id: NodeId, path: Array<string>, value: any});
  void setHighlighted({id: ?NodeId});
  void setSearchActive({active: boolean});
  GetSearchResultsResponse getSearchResults({query: string});
};

interface DesktopLayoutPlugin {
  void invalidate({id: NodeId});
  void select({path: Array<NodeId>});
};

type GetNodesResponse = {
  elements: Array<Node>
};
type GetAllNodesResponse = {
  elements: Array<Node>,
  rootElement: NodeId
};
type GetSearchResultsResponse = {
  results: ?SearchResultNode,
  query: string
};

type SearchResultNode = {
  id: NodeId,
  isMatch: boolean,
  element: Node,
  children: ?Array<SearchResultNode>
}
type NodeId = string;
```

**getRoot**: Return the root node of your hierarchy. This is the entry point of Flipper's traversal of your layout.

**getNodes**: Map a set of NodeIds to their corresponding nodes. This call is used to among other things query the children of a node.

**getAllNodes**: Similar to getNodes, this should return all nodes in the current layout tree. Ordinarily, nodes are requested lazily, however this exists for taking snapshots of the current state.

**setData**: Set the data of an mutable data object returned as part of the data field of a node. The id parameter identifies the node, the path parameter is a index path into an object, e.g. `['bounds', 'left']` and the value parameter is a value of appropriate type to be used as an override.

**setHighlighted**: Mark a node as highlighted. It is expected that implementations adds a colored overlay to the node identified by id on screen, so that as the user browses the layout tree in flipper, they can easily see on the the client display the nodes they are interacting with. Passing a null id parameter removes the current highlight without highlighting a new node.

**setSearchActive**: The user has clicked on the crosshair button in Sonar. This feature allows the user to click on an element in the client UI to cause flipper to highlight the corresponding node in the layout tree. A colored overlay should be shown over the whole screen until `setSearchActive` is called with `active: false`. While `setSearchActive` is true, clicking an element in the client UI should trigger a `select` call to the flipper desktop, with the path of ids from root to selected node e.g `select(['node1', 'node6', 'node65'])` to select a grandchild of `node1`.

**getSearchResults**: Execute a query on all nodes in the tree, and return a subtree of the layout tree that contains all matching nodes and those on the path to the from the root. A parent that does not itself match the query but exists on the path to a node that does, should have attribute `isMatch: false` and only the matching nodes should have `isMatch: true`. Nodes not on the path from root to a match need not be included in the returned tree. Be careful not to confuse this method with the unrelated `setSearchActive`, which unfortunately shares a similar name.

Whenever a node or subtree changes it is expected that the client sends a `invalidate` command to the desktop app over the active connection. This will invalidate the cache of the subtree anchored by the node with the given id.
