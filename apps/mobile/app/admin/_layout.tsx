import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1D21' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index"              options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="conversations"      options={{ title: 'Conversations' }} />
      <Stack.Screen name="users"              options={{ title: 'Users' }} />
      <Stack.Screen name="listings"           options={{ title: 'Listings' }} />
      <Stack.Screen name="verifications"      options={{ title: 'Verifications' }} />
      <Stack.Screen name="conversation/[id]"  options={{ title: 'Thread' }} />
      <Stack.Screen name="orders"             options={{ title: 'Orders' }} />
      <Stack.Screen name="order/[id]"         options={{ title: 'Order Detail' }} />
      <Stack.Screen name="logistics"          options={{ title: 'Logistics' }} />
    </Stack>
  );
}
