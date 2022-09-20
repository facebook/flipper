/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.annotation.SuppressLint
import android.os.Build
import android.view.View
import android.view.WindowManager
import java.lang.reflect.Field
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Modifier

/**
 * Provides access to all root views in an application.
 *
 * 95% of the time this is unnecessary and we can operate solely on current Activity's root view as
 * indicated by getWindow().getDecorView(). However in the case of popup windows, menus, and dialogs
 * the actual view hierarchy we should be operating on is not accessible thru public apis.
 *
 * In the spirit of degrading gracefully when new api levels break compatibility, callers should
 * handle a list of size 0 by assuming getWindow().getDecorView() on the currently resumed activity
 * is the sole root - this assumption will be correct often enough.
 *
 * Obviously, you need to be on the main thread to use this.
 */
class RootViewResolver {
  private var initialized = false
  private var windowManagerObj: Any? = null
  private var viewsField: Field? = null
  private var paramsField: Field? = null

  class RootView(val view: View, val param: WindowManager.LayoutParams?)
  interface Listener {
    fun onRootViewAdded(rootView: View)
    fun onRootViewRemoved(rootView: View)
    fun onRootViewsChanged(rootViews: List<View>)
  }

  class ObservableArrayList : ArrayList<View>() {
    private var listener: Listener? = null
    fun setListener(listener: Listener?) {
      this.listener = listener
    }

    override fun add(element: View): Boolean {
      val ret = super.add(element)
      listener?.let { l ->
        l.onRootViewAdded(element)
        l.onRootViewsChanged(this as List<View>)
      }
      return ret
    }

    override fun remove(element: View): Boolean {
      val ret = super.remove(element)
      listener?.let { l ->
        l.onRootViewRemoved(element)
        l.onRootViewsChanged(this as List<View>)
      }

      return ret
    }

    override fun removeAt(index: Int): View {
      val view = super.removeAt(index)
      listener?.let { l ->
        l.onRootViewRemoved(view)
        l.onRootViewsChanged(this as List<View>)
      }
      return view
    }
  }

  fun attachListener(listener: Listener?) {
    if (Build.VERSION.SDK_INT < 19 || listener == null) {
      // We don't have a use for this on older APIs. If you do then modify accordingly :)
      return
    }
    if (!initialized) {
      initialize()
    }
    try {
      viewsField?.let { vf ->
        // Forgive me father for I have sinned...
        @SuppressLint("DiscouragedPrivateApi")
        val modifiers = Field::class.java.getDeclaredField("accessFlags")
        modifiers.isAccessible = true
        modifiers.setInt(vf, vf.modifiers and Modifier.FINAL.inv())

        @Suppress("unchecked_cast") val views = vf[windowManagerObj] as List<View>

        val observableViews = ObservableArrayList()
        observableViews.setListener(listener)
        observableViews.addAll(views)

        vf[windowManagerObj] = observableViews
      }
    } catch (e: Throwable) {}
  }

  /**
   * Lists the active root views in an application at this moment.
   *
   * @return a list of all the active root views in the application.
   * @throws IllegalStateException if invoked from a thread besides the main thread.
   */
  fun listActiveRootViews(): List<RootView>? {
    if (!initialized) {
      initialize()
    }
    if (null == windowManagerObj) {
      return null
    }
    if (null == viewsField) {
      return null
    }
    if (null == paramsField) {
      return null
    }
    var maybeViews: List<View>? = null
    var maybeParams: List<WindowManager.LayoutParams>? = null
    try {
      viewsField?.let { field ->
        maybeViews =
            if (Build.VERSION.SDK_INT < 19) {
              @Suppress("unchecked_cast") val arr = field[windowManagerObj] as Array<View>
              arr.toList()
            } else {
              @Suppress("unchecked_cast")
              field[windowManagerObj] as List<View>
            }
      }

      paramsField?.let { field ->
        maybeParams =
            if (Build.VERSION.SDK_INT < 19) {
              @Suppress("unchecked_cast")
              val arr = field[windowManagerObj] as Array<WindowManager.LayoutParams>
              arr.toList()
            } else {
              @Suppress("unchecked_cast")
              field[windowManagerObj] as List<WindowManager.LayoutParams>
            }
      }
    } catch (re: RuntimeException) {
      return null
    } catch (iae: IllegalAccessException) {
      return null
    }

    val roots = mutableListOf<RootView>()
    maybeViews?.let { views ->
      maybeParams?.let { params ->
        if (views.size == params.size) {
          for (i in views.indices) {
            val view = views[i]
            val param = params[i]
            roots.add(RootView(view, param))
          }
        }
      }
    }

    return roots
  }

  private fun initialize() {
    initialized = true
    val accessClass =
        if (Build.VERSION.SDK_INT > 16) WINDOW_MANAGER_GLOBAL_CLAZZ else WINDOW_MANAGER_IMPL_CLAZZ
    val instanceMethod = if (Build.VERSION.SDK_INT > 16) GET_GLOBAL_INSTANCE else GET_DEFAULT_IMPL
    try {
      val clazz = Class.forName(accessClass)
      val getMethod = clazz.getMethod(instanceMethod)
      windowManagerObj = getMethod.invoke(null)
      viewsField = clazz.getDeclaredField(VIEWS_FIELD)
      viewsField?.let { vf -> vf.isAccessible = true }
      paramsField = clazz.getDeclaredField(WINDOW_PARAMS_FIELD)
      paramsField?.let { pf -> pf.isAccessible = true }
    } catch (ite: InvocationTargetException) {} catch (cnfe: ClassNotFoundException) {} catch (
        nsfe: NoSuchFieldException) {} catch (nsme: NoSuchMethodException) {} catch (
        re: RuntimeException) {} catch (iae: IllegalAccessException) {}
  }

  companion object {
    private const val WINDOW_MANAGER_IMPL_CLAZZ = "android.view.WindowManagerImpl"
    private const val WINDOW_MANAGER_GLOBAL_CLAZZ = "android.view.WindowManagerGlobal"
    private const val VIEWS_FIELD = "mViews"
    private const val WINDOW_PARAMS_FIELD = "mParams"
    private const val GET_DEFAULT_IMPL = "getDefault"
    private const val GET_GLOBAL_INSTANCE = "getInstance"
  }
}
