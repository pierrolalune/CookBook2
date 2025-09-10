import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddIngredientScreen } from '../src/screens/AddIngredientScreen';

function AddIngredientPage() {
  return (
    <View style={styles.container}>
      <AddIngredientScreen />
    </View>
  );
}

export default AddIngredientPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});