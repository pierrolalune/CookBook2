import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function SettingsTabPage() {
  return (
    <View style={styles.container}>
      <SettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});