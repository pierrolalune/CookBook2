import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddRecipeScreen } from '../src/screens/AddRecipeScreen';

export default function AddRecipePage() {
  return (
    <View style={styles.container}>
      <AddRecipeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});