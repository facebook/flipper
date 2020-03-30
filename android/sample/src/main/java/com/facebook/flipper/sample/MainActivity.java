/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.example.ExampleFlipperPlugin;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.LithoView;

public class MainActivity extends AppCompatActivity {

  @Override
  protected void onCreate(final Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    NavigationFacade.sendNavigationEvent("flipper://deep_link_activity/");

    final ComponentContext c = new ComponentContext(this);
    // setContentView(LithoView.create(c, RootComponent.create(c).build()));

    FragmentManager fragmentManager = getSupportFragmentManager();
    FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();

    setContentView(R.layout.fragment_host);
    ExampleFragment fragment = new ExampleFragment();
    fragmentTransaction.add(R.id.titles, fragment);
    fragmentTransaction.commit();

    final FlipperClient client = AndroidFlipperClient.getInstanceIfInitialized();
    if (client != null) {
      final ExampleFlipperPlugin samplePlugin = client.getPluginByClass(ExampleFlipperPlugin.class);
      samplePlugin.setActivity(this);
    }
  }

  public static class ExampleFragment extends Fragment {
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
      return inflater.inflate(R.layout.text, container, false);
    }
  }
}
