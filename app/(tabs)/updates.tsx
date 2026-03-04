import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeProvider';
import { Megaphone, Calendar as CalendarIcon, Clock, Plus, X } from 'lucide-react-native';
import { auth, db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, doc, onSnapshot, addDoc } from 'firebase/firestore';

export default function Updates() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Admin / Permissions State
    const [userRole, setUserRole] = useState<string>('Student'); // Default
    const [isPostingModalVisible, setPostingModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (userId && !(global as any).isTestAuth) {
            // Listen to profile to check permissions
            const unsub = onSnapshot(doc(db, 'profiles', userId), (docSnap) => {
                if (docSnap.exists()) {
                    setUserRole(docSnap.data().role || 'Student');
                }
            });
            return () => unsub();
        } else if ((global as any).isTestAuth) {
            // Give test mode users Admin view strictly for demo purposes
            setUserRole('Admin');
        }
    }, []);

    useEffect(() => {
        // In a real app we'd fetch from Firestore `updates` collection.
        // For demonstration (or if no DB docs exist yet), we use placeholder data
        const loadPlaceholders = () => {
            setUpdates([
                { id: '1', title: 'Campus Closed for Maintenance', content: 'The ICT block will be closed this Friday for scheduled server maintenance. All classes will be online.', date: 'Today, 08:30 AM', type: 'important' },
                { id: '2', title: 'NSFAS Allowances Processed', content: 'NSFAS allowances for the current month have been processed and distributed. Please check your accounts.', date: 'Yesterday, 14:15 PM', type: 'info' },
                { id: '3', title: 'Exam Timetables Released', content: 'The final examination timetables are now available on the student portal.', date: 'Oct 24, 09:00 AM', type: 'academic' },
            ]);
            setLoading(false);
        };

        const fetchUpdates = async () => {
            if ((global as any).isTestAuth) {
                loadPlaceholders();
                return;
            }

            try {
                const q = query(collection(db, 'campus_updates'), orderBy('created_at', 'desc'));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setUpdates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else {
                    loadPlaceholders();
                }
            } catch (err) {
                console.error(err);
                loadPlaceholders(); // Fallback to placeholders on permission denied or error
            } finally {
                setLoading(false);
            }
        };

        fetchUpdates();
    }, []);

    const handleCreatePost = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            Alert.alert('Missing fields', 'Please enter both a title and the update content.');
            return;
        }

        setIsSubmitting(true);
        try {
            if ((global as any).isTestAuth) {
                // Mock adding to local state
                const newUpdate = {
                    id: Date.now().toString(),
                    title: newTitle,
                    content: newContent,
                    date: 'Just now',
                    type: 'info'
                };
                setUpdates([newUpdate, ...updates]);
            } else {
                await addDoc(collection(db, 'campus_updates'), {
                    title: newTitle,
                    content: newContent,
                    type: 'info',
                    created_at: new Date().toISOString()
                });
                // The re-fetch logic could be robust here or real-time snap, but we alert success
                Alert.alert('Success', 'Update posted to the campus board.');
            }

            setPostingModalVisible(false);
            setNewTitle('');
            setNewContent('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderUpdate = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, item.type === 'important' ? styles.iconImportant : styles.iconDefault]}>
                    <Megaphone color={item.type === 'important' ? '#FFFFFF' : colors.accent} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.dateRow}>
                        <Clock size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.date}>{item.date}</Text>
                    </View>
                </View>
            </View>
            <Text style={styles.content}>{item.content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Campus Updates</Text>
                <Text style={styles.headerSub}>Latest announcements from Admin</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={updates}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUpdate}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Admin Floating Action Button */}
            {(userRole === 'Admin' || userRole === 'SRC' || userRole === 'Lecturer') && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setPostingModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Plus color="#FFF" size={28} />
                </TouchableOpacity>
            )}

            {/* Create Post Modal */}
            <Modal
                visible={isPostingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPostingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Campus Update</Text>
                            <TouchableOpacity onPress={() => setPostingModalVisible(false)}>
                                <X color={colors.textSecondary} size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Exams Starting Soon"
                            placeholderTextColor={colors.textSecondary}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Type the announcement here..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            value={newContent}
                            onChangeText={setNewContent}
                        />

                        <TouchableOpacity
                            style={[styles.postButton, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleCreatePost}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.postButtonText}>Post Update</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    list: { padding: 16 },
    card: {
        backgroundColor: colors.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.cardLight
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBox: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12
    },
    iconDefault: { backgroundColor: 'rgba(21,107,118,0.1)' },
    iconImportant: { backgroundColor: colors.danger },
    title: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    date: { fontSize: 12, color: colors.textSecondary },
    content: { fontSize: 15, color: colors.text, lineHeight: 22 },

    // Modal & FAB Styles
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: colors.accent,
        width: 60, height: 60,
        borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, padding: 16,
        color: colors.text, fontSize: 16, marginBottom: 16
    },
    textArea: { height: 120 },
    postButton: {
        backgroundColor: colors.accent,
        borderRadius: 16, padding: 16,
        alignItems: 'center', marginTop: 8
    },
    postButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
