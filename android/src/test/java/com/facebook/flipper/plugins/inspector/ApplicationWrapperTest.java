/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.ArgumentMatchers.any;

import android.app.Activity;
import android.app.Application;
import android.app.Application.ActivityLifecycleCallbacks;
import android.os.Bundle;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class ApplicationWrapperTest {

  private ApplicationWrapper mWrapper;
  private ActivityLifecycleCallbacks mCallbacks;

  @Before
  public void setup() {
    final Application app = Mockito.mock(Application.class);
    Mockito.doAnswer(
            new Answer() {
              @Override
              public Object answer(InvocationOnMock invocation) throws Throwable {
                mCallbacks = (ActivityLifecycleCallbacks) invocation.getArguments()[0];
                return null;
              }
            })
        .when(app)
        .registerActivityLifecycleCallbacks(any(ActivityLifecycleCallbacks.class));

    mWrapper = new ApplicationWrapper(app);
  }

  @Test
  public void testActivityCreated() {
    final Activity activity1 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity1, Mockito.mock(Bundle.class));

    final Activity activity2 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity2, Mockito.mock(Bundle.class));

    assertThat(mWrapper.getActivityStack().size(), equalTo(2));
    assertThat(mWrapper.getActivityStack().get(0), equalTo(activity1));
    assertThat(mWrapper.getActivityStack().get(1), equalTo(activity2));
  }

  @Test
  public void testActivityPaused() {
    final Activity activity1 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity1, Mockito.mock(Bundle.class));

    final Activity activity2 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity2, Mockito.mock(Bundle.class));

    mCallbacks.onActivityPaused(activity2);

    assertThat(mWrapper.getActivityStack().size(), equalTo(2));
    assertThat(mWrapper.getActivityStack().get(0), equalTo(activity1));
    assertThat(mWrapper.getActivityStack().get(1), equalTo(activity2));
  }

  @Test
  public void testFinishingActivityPaused() {
    final Activity activity1 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity1, Mockito.mock(Bundle.class));

    final Activity activity2 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity2, Mockito.mock(Bundle.class));

    Mockito.when(activity2.isFinishing()).thenReturn(true);
    mCallbacks.onActivityPaused(activity2);

    assertThat(mWrapper.getActivityStack().size(), equalTo(2));
    assertThat(mWrapper.getActivityStack().get(0), equalTo(activity1));
  }

  @Test
  public void testActivityDestroyed() {
    final Activity activity1 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity1, Mockito.mock(Bundle.class));

    final Activity activity2 = Mockito.mock(Activity.class);
    mCallbacks.onActivityCreated(activity2, Mockito.mock(Bundle.class));

    Mockito.when(activity2.isFinishing()).thenReturn(true);
    mCallbacks.onActivityDestroyed(activity2);

    assertThat(mWrapper.getActivityStack().size(), equalTo(1));
    assertThat(mWrapper.getActivityStack().get(0), equalTo(activity1));
  }
}
