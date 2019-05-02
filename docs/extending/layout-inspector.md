---
id: layout-inspector
title: Extending Layout Inspector
---

The Layout Inspector plugin can be extended to support new kinds of UI components. You can also extend it to customize the data made available in the sidebar.
Depending on whether you want to expose new data on Android or iOS, there are different interfaces you can use.

![Layout Inspector](/docs/assets/layoutinspector.png)

## Android

### Node Descriptor
To expose an object to the Layout Inspector in Flipper you have to implement a `NodeDescriptor` which describes your object. For example the `ViewDescriptor` describes `View` objects and the `FragmentDescriptor` describe `Fragment` instances. These descriptors have a set of callbacks used to expose children and data associated with the object they describe. See [`NodeDescriptor`](https://github.com/facebook/flipper/blob/b0d2983bd440dc41ec67089e11acd394e6566b8f/android/src/main/java/com/facebook/flipper/plugins/inspector/NodeDescriptor.java) for the full API.

`NodeDescriptor` implementations should not subclass other `NodeDescriptor` implementations. Instead to re-use existing behavior from a more generic descriptor, you should prefer to use delegate.

**Don't**

```java
class ViewGroupDescriptor extends ViewDescriptor<ViewGroup> {
  public String getName(ViewGroup node) {
    return super.getName(node);
  }
}
```

**Do**

```java
class ViewGroupDescriptor extends NodeDescriptor<ViewGroup> {
  public String getName(ViewGroup node) {
    NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getName(node);
  }
}
```

### Register a Descriptor

Register your descriptor in the `DescriptorMapping` used to instantiate the `InspectorFlipperPlugin`.

```java
final FlipperClient client = FlipperClient.createInstance(mContext);
final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
descriptorMapping.register(MyObject.class, new MyObjectDescriptor());
client.addPlugin(new InspectorFlipperPlugin(mContext, descriptorMapping));
```

### Extending an existing Descriptor

You may not need to create a whole new descriptor but instead you may just want to change extend an existing one to expose some new piece of data. In that case just locate the correct descriptor and edit its `getData`, `getAttributes` and perhaps `setData` methods.

