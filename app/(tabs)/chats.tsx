import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, BackHandler, ScrollView } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { collection, doc, query, where, getDoc, getDocs, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from '../../components/ThemeProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Clock, MessageCircle, Users, ArrowLeft } from 'lucide-react-native';
import { format } from 'date-fns';
import { useThemedAlert } from '../../components/ThemedAlert';

export default function Chats() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { userId, name, chatId, chatName } = useLocalSearchParams();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const messagesCacheRef = useRef<Record<string, any[]>>({});
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const { show: showAlert, AlertComponent } = useThemedAlert();

    // Placeholder data for Class Group Chats to ensure the UI looks correct immediately for the demo
    const CLASS_CHATS = [
        { id: 'class_1', name: 'ICT Level 2-A', description: 'Information and Communication Tech' },
        { id: 'class_2', name: 'FEA Level 2-B', description: 'Financial Economics & Accounting' },
        { id: 'class_3', name: 'ECE Level 3', description: 'Electrical Infrastructure Construction' },
        { id: 'class_4', name: 'Civil Eng N4', description: 'Civil Engineering and Building' }
    ];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
            } else {
                setCurrentUserId(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const onBackPress = () => {
            if (userId || chatId) {
                router.replace('/(tabs)/chats');
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [userId, chatId]);

    useEffect(() => {
        if (!currentUserId) return;

        const isValidUserId = userId && userId !== 'undefined' && userId !== '';
        const isValidChatId = chatId && chatId !== 'undefined' && chatId !== '';

        if (isValidUserId || isValidChatId) {
            const cacheKeyChat = typeof chatId !== 'string' ? chatId?.[0] : chatId;
            const cacheKeyUser = typeof userId !== 'string' ? userId?.[0] : userId;
            const cacheKey = (cacheKeyChat || cacheKeyUser) as string;

            if (cacheKey && messagesCacheRef.current[cacheKey]) {
                setMessages(messagesCacheRef.current[cacheKey]);
            } else {
                setMessages([]);
            }
            fetchMessages();
        }

        // Set up real-time listeners for the active view
        let unsubscribeGroup = () => { };

        if (isValidChatId) {
            unsubscribeGroup = onSnapshot(query(collection(db, 'group_messages'), where('group_id', '==', chatId)), (snapshot) => {
                fetchMessages();
            });
        }
        return () => {
            unsubscribeGroup();
        };
    }, [userId, chatId, currentUserId]);

    const fetchMessages = async () => {
        const cleanUserId = userId && userId !== 'undefined' && userId !== '' ? userId : null;
        const cleanChatId = chatId && chatId !== 'undefined' && chatId !== '' ? chatId : null;

        if (!cleanUserId && !cleanChatId) return;

        try {
            let fetchedMessages = [];

            if (cleanChatId) {
                const qMsg = query(collection(db, 'group_messages'), where('group_id', '==', cleanChatId), orderBy('created_at', 'asc'));
                const snap = await getDocs(qMsg);

                const msgsWithProfiles = await Promise.all(snap.docs.map(async (docSnap) => {
                    const msgData = docSnap.data();
                    const profileDoc = await getDoc(doc(db, 'profiles', msgData.sender_id));
                    return {
                        id: docSnap.id,
                        ...msgData,
                        profiles: profileDoc.exists() ? profileDoc.data() : null
                    };
                }));
                fetchedMessages = msgsWithProfiles;
            } else if (cleanUserId) {
                const messagesRef = collection(db, 'direct_messages');
                const qM1 = query(messagesRef, where('sender_id', '==', currentUserId), where('receiver_id', '==', cleanUserId));
                const qM2 = query(messagesRef, where('sender_id', '==', cleanUserId), where('receiver_id', '==', currentUserId));

                const [snap1, snap2] = await Promise.all([getDocs(qM1), getDocs(qM2)]);
                const combined = [...snap1.docs.map(d => ({ id: d.id, ...d.data() })), ...snap2.docs.map(d => ({ id: d.id, ...d.data() }))];

                // Sort by date explicitly
                combined.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                const msgsWithProfiles = await Promise.all(combined.map(async (msgData: any) => {
                    const profileDoc = await getDoc(doc(db, 'profiles', msgData.sender_id));
                    return {
                        ...msgData,
                        profiles: profileDoc.exists() ? profileDoc.data() : null
                    };
                }));
                fetchedMessages = msgsWithProfiles;
            }

            const cleanChatStr = typeof cleanChatId !== 'string' ? cleanChatId?.[0] : cleanChatId;
            const cleanUserStr = typeof cleanUserId !== 'string' ? cleanUserId?.[0] : cleanUserId;
            const cacheKey = (cleanChatStr || cleanUserStr) as string;
            if (cacheKey) {
                messagesCacheRef.current[cacheKey] = fetchedMessages;
            }

            setMessages(fetchedMessages);
        } catch (e) {
            console.error('fetchMessages error:', e.message);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !currentUserId) return;
        try {
            const payload: any = {
                sender_id: currentUserId,
                content: inputText,
                created_at: new Date().toISOString()
            };

            if (chatId && chatId !== 'undefined' && chatId !== '') {
                payload.group_id = chatId;
                await addDoc(collection(db, 'group_messages'), payload);
            }

            setInputText('');

            // Manually re-fetch messages immediately after sending
            if (chatId && chatId !== 'undefined' && chatId !== '') {
                fetchMessages();
            }
        } catch (e) {
            showAlert('Error', 'Failed to send message: ' + e.message, 'error');
        }
    };

    const renderMessage = ({ item }) => {
        const isMine = item.sender_id === currentUserId;
        const isHeld = item.status === 'held';

        let senderInfo = null;
        if (chatId && !isMine && item.profiles) {
            const isStaff = ['Teacher', 'Principal', 'Vice Principal'].includes(item.profiles.role);
            const name = isStaff && item.profiles.title
                ? `${item.profiles.title} ${item.profiles.surname}`
                : `${item.profiles.first_name} ${item.profiles.surname}`;

            senderInfo = {
                name: name,
                role: item.profiles.role
            };
        }

        return (
            <View style={[styles.messageWrapper, isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs]}>
                <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs]}>
                    {senderInfo ? (
                        <View style={{ marginBottom: 4 }}>
                            <Text style={styles.senderName}>{senderInfo.name}</Text>
                            <Text style={styles.senderRole}>{senderInfo.role}</Text>
                        </View>
                    ) : null}
                    <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>{item.content}</Text>
                    <View style={styles.timeRow}>
                        {isHeld && <Clock size={12} color={isMine ? '#000' : colors.textSecondary} style={{ marginRight: 4 }} />}
                        <Text style={[styles.timeText, isMine ? styles.timeTextMine : styles.timeTextTheirs]}>
                            {item.created_at ? format(new Date(item.created_at), 'HH:mm') : ''}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderInboxItem = ({ item }) => (
        <TouchableOpacity style={styles.inboxCard} onPress={() => router.push({ pathname: '/(tabs)/chats', params: { chatId: item.id, chatName: item.name, userId: '' } })}>
            <View style={styles.inboxAvatar}>
                <Users color={colors.accent} size={24} />
            </View>
            <View style={styles.inboxContent}>
                <Text style={styles.inboxName}>{item.name}</Text>
                <Text style={styles.inboxSub}>Group Chat</Text>
            </View>
        </TouchableOpacity>
    );

    if (!userId && !chatId) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.headerTitle, { fontSize: 24 }]}>Class Chats</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Connect with your module groups</Text>
                </View>

                <FlatList
                    data={CLASS_CHATS}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.inboxCard}
                            onPress={() => router.push({ pathname: '/(tabs)/chats', params: { chatId: item.id, chatName: item.name, userId: '' } })}
                        >
                            <View style={styles.inboxAvatar}>
                                <Users color={colors.accent} size={24} />
                            </View>
                            <View style={styles.inboxContent}>
                                <Text style={styles.inboxName}>{item.name}</Text>
                                <Text style={styles.inboxSub}>{item.description}</Text>
                            </View>
                            <View style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>Join</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            </View>
        );
    }
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/chats')} style={{ marginRight: 16 }}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{chatName || name}</Text>
            </View>

            <FlatList
                data={messages}
                keyExtractor={item => item.id.toString()}
                renderItem={renderMessage}
                contentContainerStyle={{ padding: 16 }}
            />

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <Send color="#000" size={20} />
                </TouchableOpacity>
            </View>
            <AlertComponent />
        </KeyboardAvoidingView>
    );
}
const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.background },
    emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 16 },
    header: { padding: 16, backgroundColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    messageWrapper: { flexDirection: 'row', marginBottom: 12 },
    messageWrapperMine: { justifyContent: 'flex-end' },
    messageWrapperTheirs: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
    messageBubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    messageBubbleTheirs: { backgroundColor: colors.border, borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16 },
    messageTextMine: { color: '#000' },
    messageTextTheirs: { color: colors.text },
    timeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
    timeText: { fontSize: 11 },
    timeTextMine: { color: 'rgba(0,0,0,0.5)' },
    timeTextTheirs: { color: colors.textSecondary },
    inputBar: { flexDirection: 'row', padding: 12, backgroundColor: colors.border, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 100, fontSize: 16, color: colors.text },
    sendBtn: { backgroundColor: colors.accent, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 12, alignSelf: 'flex-end' },
    senderName: { fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
    senderRole: { fontSize: 11, fontWeight: '600', color: colors.accent, marginBottom: 4 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.border, padding: 4, borderRadius: 12, margin: 16 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: colors.accent },
    tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: 'bold' },
    tabTextActive: { color: '#000' },
    inboxCard: {
        flexDirection: 'row', padding: 16, marginBottom: 16,
        backgroundColor: colors.border, borderRadius: 16,
        borderWidth: 1, borderColor: colors.cardLight,
        alignItems: 'center'
    },
    inboxAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(21,107,118,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    inboxContent: { flex: 1 },
    inboxName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    inboxSub: { fontSize: 14, color: colors.textSecondary }
});
