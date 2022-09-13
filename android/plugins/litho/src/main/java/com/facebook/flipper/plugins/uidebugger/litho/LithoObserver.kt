package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.SubtreeUpdate
import com.facebook.flipper.plugins.uidebugger.TreeObserver
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.identityHashCode
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverBuilder
import com.facebook.litho.LithoView

class LithoViewTreeObserver(val context: Context) : TreeObserver<LithoView>() {

  var nodeRef: LithoView? = null
  override fun subscribe(node: Any) {
    node as LithoView

    nodeRef = node

    val listener: (view: LithoView) -> Unit = {
      val start = System.currentTimeMillis()

      val (nodes, skipped) = context.layoutTraversal.traverse(it)

      for (observerRoot in skipped) {
        if (!children.containsKey(observerRoot.identityHashCode())) {
          val observer = context.observerFactory.createObserver(observerRoot, context)!!
          observer.subscribe(observerRoot)
          children[observerRoot.identityHashCode()] = observer
        }
      }

      context.treeObserverManager.emit(
          SubtreeUpdate("Litho", nodes, start, System.currentTimeMillis()))
    }
    node.setOnDirtyMountListener(listener)

    listener(node)
  }

  override fun unsubscribe() {
    nodeRef?.setOnDirtyMountListener(null)
    nodeRef = null
  }
}

object LithoViewTreeObserverBuilder : TreeObserverBuilder<LithoView> {
  override fun canBuildFor(node: Any): Boolean {
    return node is LithoView
  }

  override fun build(context: Context): TreeObserver<LithoView> {
    return LithoViewTreeObserver(context)
  }
}
