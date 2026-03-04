import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { Megaphone, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { auth, db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default function Updates() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we'd fetch from Firestore `updates` collection.
        // For demonstration (or if no DB docs exist yet), we use placeholder data
        const fetchUpdates = async () => {
            try {
                const q = query(collection(db, 'campus_updates'), orderBy('created_at', 'desc'));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setUpdates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else {
                    // Placeholder data for the new EEC CampusBoard
                    setUpdates([
                        { id: '1', title: 'Campus Closed for Maintenance', content: 'The ICT block will be closed this Friday for scheduled server maintenance. All classes will be online.', date: 'Today, 08:30 AM', type: 'important' },
                        { id: '2', title: 'NSFAS Allowances Processed', content: 'NSFAS allowances for the current month have been processed and distributed. Please check your accounts.', date: 'Yesterday, 14:15 PM', type: 'info' },
                        { id: '3', title: 'Exam Timetables Released', content: 'The final examination timetables are now available on the student portal.', date: 'Oct 24, 09:00 AM', type: 'academic' },
                    ]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUpdates();
    }, []);

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
    content: { fontSize: 15, color: colors.text, lineHeight: 22 }
});
