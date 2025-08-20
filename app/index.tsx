import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IngredientsScreen } from '../src/screens/IngredientsScreen';

export default function HomePage() {
  return (
    <View style={styles.container}>
      <IngredientsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});