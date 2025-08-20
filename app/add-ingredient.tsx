import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddIngredientScreen } from '../src/screens/AddIngredientScreen';

export default function AddIngredientPage() {
  return (
    <View style={styles.container}>
      <AddIngredientScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});