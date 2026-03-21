import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index"         options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="conversations" options={{ title: 'Conversations' }} />
      <Stack.Screen name="users"         options={{ title: 'Users' }} />
      <Stack.Screen name="conversation/[id]" options={{ title: 'Thread' }} />
    </Stack>
  );
}
