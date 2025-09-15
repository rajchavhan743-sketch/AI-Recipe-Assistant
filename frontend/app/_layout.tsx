import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          title: 'Home' 
        }} 
      />
      <Stack.Screen 
        name="recipe-detail" 
        options={{ 
          headerShown: false,
          title: 'Recipe Details' 
        }} 
      />
      <Stack.Screen 
        name="shopping-list" 
        options={{ 
          headerShown: false,
          title: 'Shopping List' 
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          headerShown: false,
          title: 'Settings' 
        }} 
      />
    </Stack>
  );
}