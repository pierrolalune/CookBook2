import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase } from '../src/database';
import { ScreenErrorBoundary } from '../src/components/common/ErrorBoundary';
import { IngredientsProvider } from '../src/contexts/IngredientsContext';
import { FavoritesProvider } from '../src/contexts/FavoritesContext';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database on app startup
    const setupDatabase = async () => {
      try {
        // Initialize database normally
        await initializeDatabase();
        console.log('Database initialized successfully');
        
        // Database is now ready
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to setup database:', error);
        setDbError(error instanceof Error ? error.message : 'Database setup failed');
      }
    };

    setupDatabase();
  }, []);

  if (dbError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error: {dbError}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary>
      <IngredientsProvider>
        <FavoritesProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#667eea',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: 'Ingrédients',
                headerShown: true
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="add-ingredient"
              options={{
                title: 'Nouvel Ingrédient',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="add-recipe"
              options={{
                title: 'Nouvelle Recette',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="recipe/[id]"
              options={{
                title: 'Détails de la recette',
                headerShown: true
              }}
            />
            <Stack.Screen
              name="recipe/[id]/edit"
              options={{
                title: 'Modifier la recette',
                presentation: 'modal'
              }}
            />
          </Stack>
        </FavoritesProvider>
      </IngredientsProvider>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
