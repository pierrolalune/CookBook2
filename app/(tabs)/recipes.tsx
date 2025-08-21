import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RecipesScreen } from '../../src/screens/RecipesScreen';

export default function RecipesTabPage() {
  return (
    <View style={styles.container}>
      <RecipesScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});