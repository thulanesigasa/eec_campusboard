import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeProvider';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Calendar, FileText, FileSpreadsheet, BookOpen, LogOut, ChevronRight, User, Camera, Moon, Sun } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function Profile() {
    const { isDark, toggleTheme, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [profileData, setProfileData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        // Listen to profile updates in real-time
        const unsubscribe = onSnapshot(doc(db, 'profiles', userId), (docSnap) => {
            if (docSnap.exists()) {
                setProfileData(docSnap.data());
            }
        }, (error) => {
            console.warn('Profile onSnapshot error:', error.message);
        });

        return () => unsubscribe();
    }, []);

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission needed', 'Please grant camera roll permissions to change your avatar.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3, // keep the base64 string small
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setUploading(true);
                const base64Str = `data:image/jpeg;base64,${result.assets[0].base64}`;
                const userId = auth.currentUser?.uid;

                if (userId) {
                    await updateDoc(doc(db, 'profiles', userId), {
                        avatar_base64: base64Str
                    });
                } else {
                    // Test auth fallback to global memory
                    // (global as any).tempAvatar = base64Str; 
                }
            }
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

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

    const displayName = profileData
        ? `${profileData.first_name || ''} ${profileData.surname || ''}`.trim()
        : ((global as any).isTestAuth ? 'Test User' : auth.currentUser?.email);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Profile Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color={colors.accent} />
                        ) : profileData?.avatar_base64 ? (
                            <Image source={{ uri: profileData.avatar_base64 }} style={styles.avatarImage} />
                        ) : (
                            <User size={40} color={colors.accent} />
                        )}
                        <View style={styles.editAvatarBadge}>
                            <Camera size={14} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.studentId}>{profileData?.student_number || 'No ID assigned'}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{profileData?.role || 'Active Student'}</Text>
                    </View>
                </View>

                {/* Actions Grid */}
                <Text style={styles.sectionTitle}>Academic Portal</Text>
                <View style={styles.actionList}>
                    {studentActions.map((action) => (
                        <TouchableOpacity
                            key={action.id}
                            style={styles.actionCard}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (action.id === 'courses') {
                                    // Navigate to courses or show modal. For now just an alert to prove connection
                                    const coursesCount = profileData?.registered_courses?.length || 0;
                                    Alert.alert('Registered Courses', `You are registered for ${coursesCount} courses.\n\n${profileData?.registered_courses?.join('\n') || ''}`);
                                } else {
                                    Alert.alert(action.title, 'This feature is coming soon!');
                                }
                            }}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: `${action.color}15` }]}>
                                <action.icon color={action.color} size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                                <Text style={styles.actionSub}>{action.id === 'courses' ? `${profileData?.registered_courses?.length || 0} enrolled` : 'Tap to view details'}</Text>
                            </View>
                            <ChevronRight color={colors.textSecondary} size={20} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Settings & Preferences */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={[styles.actionList, { marginBottom: 24 }]}>
                    <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={toggleTheme}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(21,107,118,0.1)' }]}>
                            {isDark ? <Sun color={colors.accent} size={24} /> : <Moon color={colors.accent} size={24} />}
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Theme</Text>
                            <Text style={styles.actionSub}>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
                        </View>
                        <ChevronRight color={colors.textSecondary} size={20} />
                    </TouchableOpacity>
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
    avatarImage: {
        width: '100%', height: '100%', borderRadius: 50,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.accent,
        width: 28, height: 28,
        borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: colors.background
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
