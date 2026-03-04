import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Calendar, FileText, FileSpreadsheet, BookOpen, LogOut, ChevronRight, User } from 'lucide-react-native';

export default function Profile() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            if ((global as any).isTestAuth) {
                (global as any).isTestAuth = false;
            }
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const studentActions = [
        { id: 'timetable', title: 'Time Table', icon: Calendar, color: '#3B82F6' },
        { id: 'progress', title: 'Progress Report', icon: FileText, color: '#10B981' },
        { id: 'statement', title: 'Financial Statement', icon: FileSpreadsheet, color: '#F59E0B' },
        { id: 'courses', title: 'Registered Courses', icon: BookOpen, color: '#8B5CF6' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <User size={40} color={colors.accent} />
                    </View>
                    <Text style={styles.name}>Student Profile</Text>
                    <Text style={styles.studentId}>{(global as any).isTestAuth ? 'Test User' : auth.currentUser?.email}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Active Student</Text>
                    </View>
                </View>

                {/* Actions Grid */}
                <Text style={styles.sectionTitle}>Academic Portal</Text>
                <View style={styles.actionList}>
                    {studentActions.map((action) => (
                        <TouchableOpacity key={action.id} style={styles.actionCard} activeOpacity={0.7}>
                            <View style={[styles.iconWrapper, { backgroundColor: `${action.color}15` }]}>
                                <action.icon color={action.color} size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                                <Text style={styles.actionSub}>Tap to view details</Text>
                            </View>
                            <ChevronRight color={colors.textSecondary} size={20} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <LogOut color={colors.danger} size={20} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
    avatarContainer: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: colors.border,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2, borderColor: colors.accent
    },
    name: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    studentId: { fontSize: 16, color: colors.textSecondary, marginBottom: 12 },
    badge: {
        backgroundColor: 'rgba(21,107,118,0.1)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20
    },
    badgeText: { color: colors.accent, fontWeight: '600', fontSize: 12 },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    actionList: { gap: 12, marginBottom: 32 },
    actionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.border,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1, borderColor: colors.cardLight
    },
    iconWrapper: {
        width: 48, height: 48, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16
    },
    actionContent: { flex: 1 },
    actionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
    actionSub: { fontSize: 12, color: colors.textSecondary },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(204, 33, 40, 0.1)', // Error color with opacity
        padding: 16, borderRadius: 16,
        marginTop: 10
    },
    logoutText: { color: colors.danger, fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});
