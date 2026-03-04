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
    const [inboxChats, setInboxChats] = useState([]);
    const [communityStaff, setCommunityStaff] = useState([]);
    const [communityGroupChat, setCommunityGroupChat] = useState(null);
    const [groupChats, setGroupChats] = useState([]);
    const [activeTab, setActiveTab] = useState('Inbox'); // 'Groups', 'Community', 'Inbox'
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [schoolName, setSchoolName] = useState('Community');
    const [loading, setLoading] = useState(false);
    const { show: showAlert, AlertComponent } = useThemedAlert();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                fetchSchoolName(user.uid);
            } else {
                setCurrentUserId(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSchoolName = async (uid) => {
        try {
            const userDoc = await getDoc(doc(db, 'profiles', uid));
            if (!userDoc.exists()) return;
            const userData = userDoc.data();

            if (userData.role) setCurrentUserRole(userData.role);

            if (userData.school_id) {
                const schoolDoc = await getDoc(doc(db, 'schools', userData.school_id));
                if (schoolDoc.exists()) {
                    const sName = schoolDoc.data().name;
                    const initials = sName
                        .split(' ')
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase();
                    setSchoolName(`${initials} Staff`);
                }
            }
        } catch (e) {
            console.error('School name fetch error:', e.message);
        }
    };

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
        } else {
            fetchAllData();
        }

        // Set up real-time listeners for the active view
        let unsubscribeDirect = () => { };
        let unsubscribeGroup = () => { };

        if (isValidUserId) {
            // We have a direct chat user -> fetch direct messages
            const qDir1 = query(collection(db, 'direct_messages'), where('sender_id', '==', currentUserId), where('receiver_id', '==', userId));
            const qDir2 = query(collection(db, 'direct_messages'), where('sender_id', '==', userId), where('receiver_id', '==', currentUserId));

            // To properly do OR queries in Firestore realtime, it's often easier to just trigger a re-fetch,
            // or listen to both queries and merge. For simplicity and robustness, we'll re-run fetchMessages on changes.
            unsubscribeDirect = onSnapshot(collection(db, 'direct_messages'), (snapshot) => {
                fetchMessages();
            });
        } else if (isValidChatId) {
            unsubscribeGroup = onSnapshot(query(collection(db, 'group_messages'), where('group_id', '==', chatId)), (snapshot) => {
                fetchMessages();
            });
        } else {
            // Main screen listener: wait for new messages that might create a new inbox item
            unsubscribeDirect = onSnapshot(query(collection(db, 'direct_messages'), where('receiver_id', '==', currentUserId)), () => fetchAllData());
            unsubscribeGroup = onSnapshot(query(collection(db, 'group_messages')), () => fetchAllData()); // A bit heavy, consider refining for production
        }

        return () => {
            unsubscribeDirect();
            unsubscribeGroup();
        };
    }, [userId, chatId, currentUserId, activeTab]);

    const fetchAllData = async () => {
        setLoading(true);
        // Fetch Inbox first to get active contacts
        const activeContacts = await fetchInbox();
        await Promise.all([fetchGroups(), fetchCommunity(activeContacts)]);
        setLoading(false);
    };

    const fetchGroups = async () => {
        try {
            const q = query(collection(db, 'chat_participants'), where('user_id', '==', currentUserId));
            const snapshot = await getDocs(q);

            const groupPromises = snapshot.docs.map(async (docSnap) => {
                const partData = docSnap.data();
                const groupDoc = await getDoc(doc(db, 'chat_groups', partData.group_id));
                if (groupDoc.exists()) {
                    return { id: groupDoc.id, ...groupDoc.data() };
                }
                return null;
            });

            const resolvedGroups = await Promise.all(groupPromises);
            const groups = resolvedGroups.filter((g: any) => g && g.name !== 'Community');

            setGroupChats(groups);
        } catch (e) {
            console.error('Groups fetch error:', e.message);
        }
    };

    const fetchCommunity = async (activeContactIds = []) => {
        try {
            // Fetch all staff members except current user and those already in activeContactIds
            const qStaff = query(collection(db, 'profiles'), where('role', 'in', ['Teacher', 'Principal', 'Vice Principal']));
            const snapshot = await getDocs(qStaff);

            const staffList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(staff => staff.id !== currentUserId && !activeContactIds.includes(staff.id));

            setCommunityStaff(staffList);

            // Fetch the 'Community' group chat for this user
            const qCommPart = query(collection(db, 'chat_participants'), where('user_id', '==', currentUserId));
            const partSnap = await getDocs(qCommPart);

            for (const partDoc of partSnap.docs) {
                const groupId = partDoc.data().group_id;
                const groupDoc = await getDoc(doc(db, 'chat_groups', groupId));
                if (groupDoc.exists() && groupDoc.data().name === 'Community') {
                    setCommunityGroupChat({ id: groupDoc.id, ...groupDoc.data() });
                    break;
                }
            }
        } catch (e) {
            console.error('Community fetch error:', e.message);
        }
    };

    const fetchInbox = async () => {
        try {
            // Firestore doesn't inherently support OR conditions well without 'in' lists. 
            // Better to split sender and receiver queries and merge.
            const messagesRef = collection(db, 'direct_messages');
            const qSent = query(messagesRef, where('sender_id', '==', currentUserId), orderBy('created_at', 'desc'));
            const qReceived = query(messagesRef, where('receiver_id', '==', currentUserId), orderBy('created_at', 'desc'));

            const [sentSnap, receivedSnap] = await Promise.all([getDocs(qSent), getDocs(qReceived)]);

            const allMessages = [
                ...sentSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                ...receivedSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const conversations = [];
            const seen = new Set();
            const contactIds = [];

            for (const msg of allMessages) {
                const contactId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
                if (contactId && !seen.has(contactId)) {
                    seen.add(contactId);
                    contactIds.push(contactId);

                    // Fetch profile info to attach
                    const profileDoc = await getDoc(doc(db, 'profiles', contactId));
                    let profileData = profileDoc.exists() ? profileDoc.data() : { first_name: 'Unknown', surname: 'User' };

                    conversations.push({
                        ...msg,
                        contact: {
                            ...profileData,
                            id: contactId
                        }
                    });
                }
            }

            setInboxChats(conversations);
            return contactIds; // Return for Community filtering
        } catch (e) {
            console.error('Inbox fetch error:', e.message);
            return [];
        }
    };

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
            } else if (userId && userId !== 'undefined' && userId !== '') {
                payload.receiver_id = userId;
                await addDoc(collection(db, 'direct_messages'), payload);
            }

            setInputText('');

            // Manually re-fetch messages immediately after sending
            if ((chatId && chatId !== 'undefined' && chatId !== '') || (userId && userId !== 'undefined' && userId !== '')) {
                fetchMessages();
            } else {
                fetchAllData();
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
                <Users color="#9CC222" size={24} />
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
                <View style={styles.tabContainer}>
                    {['Groups', 'Community', 'Inbox']
                        .filter(tab => {
                            if (tab === 'Groups' && (currentUserRole === 'Principal' || currentUserRole === 'Vice Principal')) return false;
                            if (tab === 'Community' && currentUserRole === 'Parent') return false;
                            return true;
                        })
                        .map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.tabActive]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                    {tab === 'Community' ? schoolName : tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                </View>

                {activeTab === 'Inbox' && (
                    <FlatList
                        data={inboxChats}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => {
                            const displayName = item.contact.title
                                ? `${item.contact.title} ${item.contact.surname}`
                                : `${item.contact.first_name} ${item.contact.surname}`;
                            return (
                                <TouchableOpacity
                                    style={styles.inboxCard}
                                    onPress={() => router.push({ pathname: '/(tabs)/chats', params: { userId: item.contact.id, name: displayName, chatId: '' } })}
                                >
                                    <View style={styles.inboxAvatar}>
                                        <MessageCircle color="#9CC222" size={24} />
                                    </View>
                                    <View style={styles.inboxContent}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.inboxName}>{displayName}</Text>
                                            <Text style={styles.inboxTime}>{format(new Date(item.created_at), 'HH:mm')}</Text>
                                        </View>
                                        <Text style={styles.inboxSub} numberOfLines={1}>{item.content}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <MessageCircle size={48} color={colors.border} />
                                <Text style={styles.emptyText}>No messages yet.</Text>
                            </View>
                        )}
                    />
                )}

                {activeTab === 'Groups' && (
                    <FlatList
                        data={groupChats}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.inboxCard}
                                onPress={() => router.push({ pathname: '/(tabs)/chats', params: { chatId: item.id, chatName: item.name, userId: '' } })}
                            >
                                <View style={styles.inboxAvatar}>
                                    <Users color="#9CC222" size={24} />
                                </View>
                                <View style={styles.inboxContent}>
                                    <Text style={styles.inboxName}>{item.name}</Text>
                                    <Text style={styles.inboxSub}>Group Chat</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Users size={48} color={colors.border} />
                                <Text style={styles.emptyText}>You haven't joined any groups.</Text>
                            </View>
                        )}
                    />
                )}

                {activeTab === 'Community' && (
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        {communityGroupChat && (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    padding: 16,
                                    borderWidth: 1,
                                    borderColor: '#9CC222',
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(156,194,34,0.05)',
                                    marginBottom: 16
                                }}
                                onPress={() => router.push({ pathname: '/(tabs)/chats', params: { chatId: communityGroupChat.id, chatName: schoolName, userId: '' } })}
                            >
                                <View style={[styles.inboxAvatar, { backgroundColor: 'rgba(156,194,34,0.15)' }]}>
                                    <Users color="#9CC222" size={24} />
                                </View>
                                <View style={styles.inboxContent}>
                                    <Text style={styles.inboxName}>{schoolName} Chat</Text>
                                    <Text style={styles.inboxSub}>All Staff Members</Text>
                                </View>
                                <MessageCircle color="#9CC222" size={20} />
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
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
    messageBubbleMine: { backgroundColor: '#9CC222', borderBottomRightRadius: 4 },
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
    sendBtn: { backgroundColor: '#9CC222', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 12, alignSelf: 'flex-end' },
    senderName: { fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
    senderRole: { fontSize: 11, fontWeight: '600', color: colors.accent, marginBottom: 4 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.border, padding: 4, borderRadius: 12, margin: 16 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#9CC222' },
    tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: 'bold' },
    tabTextActive: { color: '#000' },
    inboxTime: { fontSize: 12, color: colors.textSecondary },
    inboxCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardLight, alignItems: 'center' },
    inboxAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(156,194,34,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    inboxContent: { flex: 1 },
    inboxName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
    inboxSub: { fontSize: 14, color: colors.textSecondary }
});
