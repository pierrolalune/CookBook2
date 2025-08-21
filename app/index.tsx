import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { IngredientsScreen } from '../src/screens/IngredientsScreen';

export default function HomePage() {
  useEffect(() => {
    // Redirect to tabs for better navigation
    router.replace('/(tabs)/ingredients');
  }, []);

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