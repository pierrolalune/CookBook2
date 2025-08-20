import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase, resetDatabase } from '../src/database';
import { ScreenErrorBoundary } from '../src/components/common/ErrorBoundary';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database on app startup
    const setupDatabase = async () => {
      try {
        // First initialize the database
        await initializeDatabase();
        console.log('Database initialized, now resetting for development...');
        
        // Reset database for fresh start (development only)
        await resetDatabase();
        console.log('🚀 App ready - Database reset and reseeded complete');
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
        <Text style={styles.loadingText}>Setting up fresh database...</Text>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary>
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
          name="add-ingredient" 
          options={{ 
            title: 'Nouvel Ingrédient',
            presentation: 'modal'
          }} 
        />
      </Stack>
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