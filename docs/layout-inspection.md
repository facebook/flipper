---
id: layout-inspection
title: Layout Inspection Protocol
sidebar_label: Layout Inspection
---

To support Sonar's layout inspector on a new platform you have to implement a plugin with the id `Inspector` which implements the following interface.

## Node

```javascript
type NodeId = string;

type InspectorValue = {
  __type__: 'auto' | 'text' | 'number' | 'boolean' | 'enum' | 'color',
  __mutable__: boolean,
  value: number | string | boolean,
};

type Node = {
  id: NodeId,
  name: string,
  data: ?{ string: Object },
  children: Array<NodeId>,
  attributes: ?Array<{ name: string, value: string }>,
  decoration: ?string,
};
```

`Node` is the core data type of the layout inspector. The Sonar desktop plugin visualizes a tree of nodes with associated data and attributes. Any UI or data model which can be modeled as a tree of nodes can be inspected using the layout inspector. Data associated with the nodes can also be edited.

* `id` is a stable globally unique node identifier.
* `name` is the user facing identifier for this node. It does not need to be unique. Typically the class name of the node is used as the node's name.
* `data` is a set of named JSON objects representing data associated with the node. This data is immutable by default but can be made mutable by wrapping any value in a `InspectorValue` setting `__mutable__` to `true`. `InspectorValue` can also be used to change the parsed type of the value, such as parsing a number as a color to show the value in a color picker.
* `children` is a list of identifiers pointing to children of this node. This is a list of identifiers instead of a list of nodes to allow nodes to be lazily instantiated.
* `attributes` is a list of key:value pairs which are shown next to the name inline in the layout inspector.
* `decoration` is a string identifying the optional icon used to decorate a node in the layout inspector. Adding new decoration options requires adding an icon file to the Sonar desktop app. Currently supports `componentkit` and `litho` decorations.

## Plugin Interface

```javascript
interface ClientLayoutPlugin {
  Node getRoot();
  Array<Node> getNodes({ids: Array<NodeId>});
  void setData({id: NodeId, path: Array<string>, value: any});
  void setHighlighted({id: ?NodeId});
  void setSearchActive({active: boolean});
};

interface DesktopLayoutPlugin {
  void invalidate({id: NodeId});
  void select({path: Array<NodeId>});
};
```

* `getRoot` - Return the root node of your hierarchy. This is the entry point of Sonar's traversal of your layout.
* `getNodes` - Map a set of `NodeId`s to their corresponding nodes. This call is used to among other things query the children of a node.
* `setData` - Sets the data of an immutable `data` object returned as part of the data field of a node. The `id` parameter identifies the node, the path parameter is a index path into an object, for example `['bounds', 'left']`, and the `value` parameter is a value of appropriate type to be used as an override.
* `setHighlighted` - Mark a node as highlighted. It is expected that the implementer adds a colored overlay to the node identified by `id`. Passing a null `id` parameter removes the current highlight without highlighting a new node.
* `setSearchActive` - The user has clicked on the target button in Sonar. This feature should allow the user to click on an element in the UI and inspect that element. A colored overlay should be shown over the whole screen until `setSearchActive` is called with `active: false`. until then clicks should build an id path to the clicked node and call select on the active connection with the id path as the path parameter, example `select(['node1', 'node1_child1', 'node1_child1_child1'])` to select `node1_child1_child1` in this case.
  Whenever a node or subtree changes it is expected that the client send a `invalidate(id)` command to the desktop app over the active connection. This call will invalidate the cache of the subtree anchored by the node with the given id.

Whenever a node or subtree changes it is expected that the client send a `invalidate(id)` command to the desktop app over the active connection. This call will invalidate the cache of the subtree anchored by the node with the given id.
