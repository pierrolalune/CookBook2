import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../src/database';
import { ScreenErrorBoundary } from '../src/components/common/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app startup
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    setupDatabase();
  }, []);

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