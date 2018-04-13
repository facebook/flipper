/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console;

import static org.junit.Assert.assertEquals;

import com.facebook.testing.robolectric.v3.WithTestDefaultsRunner;
import com.google.common.collect.ImmutableMap;
import java.util.Collections;
import java.util.HashMap;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mozilla.javascript.ContextFactory;

@RunWith(WithTestDefaultsRunner.class)
public class JavascriptSessionTest {

  ContextFactory mContextFactory = new ContextFactory();

  @Test
  public void testSimpleExpressionsEvaluate() throws Exception {
    JavascriptSession session =
        new JavascriptSession(mContextFactory, Collections.<String, Object>emptyMap());
    JSONObject json = session.evaluateCommand("2+2-1");
    assertEquals(3, json.getInt("value"));
  }

  @Test
  public void testStatePersistsBetweenCommands() throws Exception {
    JavascriptSession session =
        new JavascriptSession(mContextFactory, Collections.<String, Object>emptyMap());
    session.evaluateCommand("var x = 10;");
    JSONObject json = session.evaluateCommand("x");
    assertEquals(10, json.getInt("value"));
  }

  @Test
  public void testVariablesGetBoundCorrectly() throws Exception {
    JavascriptSession session =
        new JavascriptSession(
            mContextFactory,
            ImmutableMap.<String, Object>of(
                "a", 2,
                "b", 2));
    JSONObject json = session.evaluateCommand("a+b");
    assertEquals("json", json.getString("type"));
    assertEquals(4, json.getInt("value"));
  }

  @Test
  public void testNumberEvaluation() throws Exception {
    assertEquals(4, evaluateWithNoGlobals("4").getInt("value"));
  }

  @Test
  public void testStringEvaluation() throws Exception {
    assertEquals("hello", evaluateWithNoGlobals("\"hello\"").getString("value"));
  }

  @Test
  public void testJavaObjectEvaluation() throws Exception {
    JavascriptSession session =
        new JavascriptSession(
            mContextFactory,
            ImmutableMap.<String, Object>of("object", new HashMap<String, String>()));
    JSONObject json = session.evaluateCommand("object");
    assertEquals("javaObject", json.getString("type"));
    assertEquals("{}", json.getJSONObject("value").getString("toString"));
  }

  @Test
  public void testJavaMethodEvaluation() throws Exception {
    JavascriptSession session =
        new JavascriptSession(
            mContextFactory,
            ImmutableMap.<String, Object>of("object", new HashMap<String, String>()));
    JSONObject json = session.evaluateCommand("object.get");
    assertEquals("method", json.getString("type"));
  }

  @Test
  public void testJsFunctionEvaluation() throws Exception {
    JSONObject json = evaluateWithNoGlobals("function() {}");
    assertEquals("function", json.getString("type"));
    assertEquals("function(){}", removeWhitespace(json.getString("value")));
  }

  @Test
  public void testNullEvaluation() throws Exception {
    assertEquals("null", evaluateWithNoGlobals("null").getString("type"));
    assertEquals("null", evaluateWithNoGlobals("undefined").getString("type"));
  }

  private static String removeWhitespace(String input) {
    return input.replaceAll("\\s", "");
  }

  private JSONObject evaluateWithNoGlobals(String input) throws Exception {
    JavascriptSession session =
        new JavascriptSession(mContextFactory, new HashMap<String, Object>());
    return session.evaluateCommand(input);
  }
}
