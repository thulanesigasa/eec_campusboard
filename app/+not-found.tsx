import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>This screen doesn't exist.</Text>
                <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
                    <Text style={{ color: '#60A5FA' }}>Go to home screen!</Text>
                </Link>
            </View>
        </>
    );
}
