/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

/**
 * This interface marks a Descriptor in a way that is specially understood by the register. When
 * registered for a particular class 'T', a Descriptor that implements this interface will be
 * chained (via ChainedDescriptor.setSuper) to the Descriptor that is registered for the super class
 * of 'T'. If the super class of 'T' doesn't have a registration, then the super-super class will be
 * used (and so on). This allows you to implement Descriptor for any class in an inheritance
 * hierarchy without having to couple it (via direct inheritance) to the super-class' Descriptor.
 *
 * To understand why this is useful, let's say you wanted to write a Descriptor for ListView. You
 * have three options:
 *
 * The first option is to derive directly from Descriptor and write code to describe everything
 * about instances of ListView, including details that are exposed by super classes such as
 * ViewGroup, View, and even Object. This isn't generally a very good choice because it would
 * require a lot of duplicated code amongst many descriptor implementations.
 *
 * The second option is to derive your ListViewDescriptor from ViewGroupDescriptor and only
 * implement code to describe how ListView differs from ViewGroup. This will result in a class
 * hierarchy that is parallel to the one that you are describing, but is also not a good choice for
 * two reasons (let's assume for the moment that ViewGroupDescriptor is deriving from
 * ViewDescriptor). The first problem is that you will need to write code for aggregating results
 * from the super-class in methods such as Descriptor.getChildren and Descriptor.getAttributes. The
 * second problem is that you'd end up with a log of fragility if you ever want to implement a
 * descriptor for classes that are in-between ViewGroup and ListView, e.g. AbsListView. Any
 * descriptor that derived from ViewGroupDescriptor and described a class deriving from AbsListView
 * would have to be modified to now derive from AbsListViewDescriptor.
 *
 * The third option is to implement ChainedDescriptor (e.g. by deriving from
 * AbstractChainedDescriptor) which solves all of these issues for you.
 */
interface ChainedDescriptor<T> {
  fun setSuper(superDescriptor: Descriptor<T>)
}
