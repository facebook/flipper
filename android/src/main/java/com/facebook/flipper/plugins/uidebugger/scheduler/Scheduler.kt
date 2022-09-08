/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.scheduler

import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class Scheduler<T>(val task: Task<T>, val rate: Long = 500L) {
  interface Task<T> {
    fun execute(): T?
    fun process(input: T)
  }

  private val mainLooper: Handler = Handler(Looper.getMainLooper())

  private val mainRunnable = MainThreadRunnable()
  private val backgroundRunnable = BackgroundThreadRunnable()

  private var backgroundHandler: HandlerThread? = null
  private var backgroundLooper: Handler? = null

  private var isRunning = false

  private val lock = ReentrantLock()
  private val condition = lock.newCondition()
  private val queue = mutableListOf<T>()

  fun start() {
    backgroundHandler = HandlerThread("INSPECTOR_WORKER")
    backgroundHandler?.let { handlerThread ->
      handlerThread.start()
      backgroundLooper = Handler(handlerThread.looper)
    }

    isRunning = true
    mainLooper.postDelayed(mainRunnable, rate)
  }

  fun stop() {
    backgroundLooper?.post(CancellationRunnable())
  }

  fun execute() {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      mainRunnable.run()
    } else {
      mainLooper.post(mainRunnable)
    }
  }

  inner class MainThreadRunnable : Runnable {
    override fun run() {
      if (!isRunning) {
        return
      }

      try {
        val output = task.execute()
        output?.let { output ->
          lock.withLock {
            queue.add(output)
            condition.signal()
          }
        }
      } catch (e: Exception) {}

      mainLooper.postDelayed(mainRunnable, rate)
      backgroundLooper?.post(backgroundRunnable)
    }
  }

  inner class BackgroundThreadRunnable : Runnable {
    override fun run() {
      if (!isRunning) {
        return
      }
      try {
        var input: T?
        lock.withLock {
          while (queue.isEmpty()) {
            condition.await()
          }
          input = queue.removeFirst()
        }
        input?.let { input -> task.process(input) }
      } catch (e: Exception) {}
    }
  }

  inner class CancellationRunnable : Runnable {
    override fun run() {
      backgroundHandler?.interrupt()

      mainLooper.removeCallbacks(mainRunnable)
      backgroundLooper?.removeCallbacks(backgroundRunnable)

      backgroundHandler = null

      isRunning = false
    }
  }
}
