import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../components/ThemeProvider';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, MessageCircle, X } from 'lucide-react-native';

export default function Search() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSearch = async (text) => {
        setQuery(text);
        if (!text.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // Firestore doesn't support complex text search well naturally without extensions
            // Since this is for staff only and lists are small, we'll fetch all staff and filter locally
            const profilesRef = collection(db, 'profiles');
            const q = query(profilesRef, where('role', 'in', ['Teacher', 'Principal', 'Vice Principal']));
            const snapshot = await getDocs(q);

            const allStaff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const lowerQuery = text.toLowerCase();
            const filteredData = allStaff.filter((profile: any) =>
                (profile.first_name && profile.first_name.toLowerCase().includes(lowerQuery)) ||
                (profile.surname && profile.surname.toLowerCase().includes(lowerQuery))
            );

            setResults(filteredData);
        } catch (error) {
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const startChat = (teacherId, teacherName) => {
        router.push(`/(tabs)/chats?userId=${teacherId}&name=${teacherName}`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <SearchIcon color={colors.textSecondary} size={20} />
                <TextInput
                    style={styles.input}
                    placeholder="Search staff by name or surname..."
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={handleSearch}
                />
                {loading && <ActivityIndicator size="small" color="#9CC222" style={{ marginRight: 8 }} />}
                {!loading && query.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')} style={{ marginRight: 8 }}>
                        <X color={colors.textSecondary} size={18} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={results}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                    const isStaff = item.role === 'Teacher' || item.role === 'Principal' || item.role === 'Vice Principal';
                    const displayName = (isStaff && item.title)
                        ? `${item.title} ${item.surname}`
                        : `${item.first_name} ${item.surname}`;

                    return (
                        <View style={styles.resultCard}>
                            <View style={styles.avatar} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{displayName}</Text>
                                <Text style={styles.roleText}>{item.role}</Text>
                            </View>
                            <TouchableOpacity onPress={() => startChat(item.id, displayName)} style={styles.chatBtn}>
                                <MessageCircle color="#9CC222" size={20} />
                                <Text style={{ color: '#9CC222', marginLeft: 6, fontWeight: 'bold' }}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={() => (
                    query.length > 0 && !loading && (
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No staff members found matching "{query}"</Text>
                        </View>
                    )
                )}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: colors.border,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.text },
    searchBtn: { backgroundColor: '#9CC222', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    resultCard: {
        backgroundColor: colors.border,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, marginRight: 12 },
    name: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    roleText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'rgba(156,194,34,0.1)', borderRadius: 8 },
    centered: { padding: 40, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, textAlign: 'center', fontSize: 15 }
});
