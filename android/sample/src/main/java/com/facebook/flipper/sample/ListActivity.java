/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.app.Activity;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import java.util.ArrayList;

public class ListActivity extends Activity {

  ListView listView;
  ArrayList<String> list;
  ArrayAdapter<String> adapter;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_list);

    listView = findViewById(R.id.list);

    list = new ArrayList<>();
    list.add("Apple");
    list.add("Banana");
    list.add("Pineapple");
    list.add("Orange");
    list.add("Lychee");
    list.add("Guava");
    list.add("Peach");
    list.add("Melon");
    list.add("Watermelon");
    list.add("Papaya");
    list.add("Grape");
    list.add("Apricot");
    list.add("Coconut");
    list.add("Banana");
    list.add("Cherry");
    list.add("Pear");
    list.add("Mango");
    list.add("Plum");

    adapter = new ArrayAdapter<String>(this, android.R.layout.simple_list_item_1, list);
    listView.setAdapter(adapter);
  }
}
