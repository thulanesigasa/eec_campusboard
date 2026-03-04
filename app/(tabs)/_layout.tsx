import { Tabs } from 'expo-router';
import { Home, ScanLine, MessageCircle, Search, User } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';

export default function TabLayout() {
    const { isDark, colors } = useTheme();
    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
            headerShown: true,
            headerStyle: { backgroundColor: colors.background, shadowColor: 'transparent', elevation: 0 },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
        }}>
            <Tabs.Screen
                name="updates"
                options={{
                    title: 'Updates',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="chats"
                options={{
                    title: 'Chats',
                    tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
