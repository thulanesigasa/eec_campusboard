import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';

function LoadingScreen() {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.accent} />
        </View>
    );
}

export default function RootLayout() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasToken, setHasToken] = useState(false);
    const segments = useSegments();

    useEffect(() => {
        let mounted = true;

        // Check current session
        if (mounted) {
            setHasToken(!!auth.currentUser);
            setIsLoading(false);
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (mounted) {
                setHasToken(!!user);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const isTestAuth = (global as any).isTestAuth;

        if (!hasToken && !inAuthGroup && !isTestAuth) {
            router.replace('/login');
        } else if ((hasToken || isTestAuth) && inAuthGroup) {
            router.replace('/feed');
        }
    }, [hasToken, isLoading, segments]);

    if (isLoading) {
        return (
            <ThemeProvider>
                <LoadingScreen />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
            </Stack>
        </ThemeProvider>
    );
}
