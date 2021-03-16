/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React, {useState} from 'react';

import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {addPlugin} from 'react-native-flipper';

if (__DEV__ || true) {
  const mammals = [
    {
      id: 'Polar Bear',
      title: 'Polar Bear',
      url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ursus_maritimus_4_1996-08-04.jpg/190px-Ursus_maritimus_4_1996-08-04.jpg',
    },
    {
      id: 'Sea Otter',
      title: 'Sea Otter',
      url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sea_otter_cropped.jpg/220px-Sea_otter_cropped.jpg',
    },
    {
      id: 'West Indian Manatee',
      title: 'West Indian Manatee',
      url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FL_fig04.jpg/230px-FL_fig04.jpg',
    },
    {
      id: 'Bottlenose Dolphin',
      title: 'Bottlenose Dolphin',
      url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/220px-Tursiops_truncatus_01.jpg',
    },
  ];
  // minimal plugin that connects to sea-mammals plugin
  addPlugin({
    getId() {
      return 'sea-mammals';
    },
    onConnect(connection) {
      mammals.forEach((m) => {
        connection.send('newRow', m);
      });
    },
    onDisconnect() {},
  });
}

import FlipperTicTacToe from './FlipperTicTacToe';

const API = 'https://status.npmjs.org/';

const App: () => React$Node = () => {
  const [npmStatus, setNpmStatus] = useState('NPM status: unknown');
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <Header />
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <FlipperTicTacToe />
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Network & Logging</Text>
              <Text style={styles.sectionDescription}>{npmStatus}</Text>
              <Button
                title="Is NPM up?"
                onPress={() => {
                  console.log('Making request to ' + API);
                  fetch(API, {headers: {accept: 'application/json'}})
                    .then((res) => res.json())
                    .then((data) => {
                      console.log(data.status);
                      setNpmStatus(data.status.description);
                    })
                    .catch((e) => {
                      console.error('Failed to fetch status: ' + e);
                      console.error(e);
                      setNpmStatus('Error: ' + e);
                    });
                }}
              />
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Step One</Text>
              <Text style={styles.sectionDescription}>
                Edit <Text style={styles.highlight}>App.js</Text> to change this
                screen and then come back to see your edits.
              </Text>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>See Your Changes</Text>
              <Text style={styles.sectionDescription}>
                <ReloadInstructions />
              </Text>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Debug</Text>
              <Text style={styles.sectionDescription}>
                <DebugInstructions />
              </Text>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Learn More</Text>
              <Text style={styles.sectionDescription}>
                Read the docs to discover what to do next:
              </Text>
            </View>
            <LearnMoreLinks />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
