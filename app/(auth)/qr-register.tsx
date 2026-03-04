import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, addDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useThemedAlert } from '../../components/ThemedAlert';

const CURRICULUM_DATA = {
    'Foundation Phase (Gr 1-3)': [
        'Home Language', 'First Additional Language', 'Mathematics', 'Life Skills'
    ],
    'Intermediate Phase (Gr 4-6)': [
        'Home Language', 'First Additional Language', 'Mathematics',
        'Natural Sciences and Technology', 'Social Sciences', 'Life Skills'
    ],
    'Senior Phase (Gr 7-9)': [
        'Home Language', 'First Additional Language', 'Mathematics',
        'Natural Sciences', 'Social Sciences', 'Technology',
        'Economic and Management Sciences (EMS)', 'Life Orientation', 'Creative Arts'
    ]
};

export default function QRRegister() {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { show: showAlert, AlertComponent } = useThemedAlert();

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getCameraPermissions();
    }, []);

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);

        try {
            const payload = JSON.parse(data);

            if (payload.type !== 'parent_invite') {
                throw new Error("Invalid QR Code type.");
            }

            if (!payload.school_id || !payload.child_first_name || !payload.child_surname || !payload.grade) {
                throw new Error("Missing required learner details in QR code.");
            }

            setLoading(true);

            // Generate a random email and password for anonymous parent sign-up
            const pseudoEmailId = Math.random().toString(36).substring(2, 10);
            const dummyEmail = `parent_${pseudoEmailId}@cxnnect.app`;
            const dummyPassword = Math.random().toString(36).slice(-10); // 10 chars

            // 1. Sign up user
            const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
            const userId = userCredential.user.id || userCredential.user.uid;

            // 2. Create Profile (assume Parent role)
            await setDoc(doc(db, 'profiles', userId), {
                id: userId,
                role: 'Parent',
                first_name: 'Parent', // They can update later
                surname: payload.child_surname,
                school_id: payload.school_id,
            });

            // 3. Create Learner Record
            await addDoc(collection(db, 'learners'), {
                first_name: payload.child_first_name,
                surname: payload.child_surname,
                grade: payload.grade,
                parent_id: userId,
                school_id: payload.school_id,
                subjects: [] // Parent can edit later
            });

            // 4. Auto-join Parent to existing relevant chats
            const numGrade = parseInt(payload.grade, 10);
            const subjectsToCheck = numGrade <= 3 ? CURRICULUM_DATA['Foundation Phase (Gr 1-3)'] :
                numGrade <= 6 ? CURRICULUM_DATA['Intermediate Phase (Gr 4-6)'] :
                    numGrade <= 9 ? CURRICULUM_DATA['Senior Phase (Gr 7-9)'] :
                        []; // Fet phase selects later

            if (subjectsToCheck && subjectsToCheck.length > 0) {
                for (const subject of subjectsToCheck) {
                    const chatName = `Grade ${payload.grade} - ${subject}`;

                    const groupRef = collection(db, 'chat_groups');
                    const qGroup = query(groupRef, where('school_id', '==', payload.school_id), where('name', '==', chatName));
                    const groupSnap = await getDocs(qGroup);

                    if (!groupSnap.empty) {
                        await addDoc(collection(db, 'chat_participants'), {
                            group_id: groupSnap.docs[0].id,
                            user_id: userId,
                            role: 'member'
                        });
                    }
                }
            }

            showAlert('Success', 'Automatically registered!', 'success');

            // Wait for alert visual then redirect
            setTimeout(() => {
                router.replace('/(tabs)/feed');
            }, 1000);

        } catch (error) {
            showAlert('Scan Failed', error.message || 'Invalid QR format', 'error');
            // Allow them to scan again after a failure
            setTimeout(() => setScanned(false), 2000);
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><ActivityIndicator color="#9CC222" /></View>;
    }
    if (hasPermission === false) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.text}>No access to camera</Text>
                    <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
                        <Text style={styles.btnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Scan to Register</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Scanner Overlay UI */}
                <View style={styles.overlay}>
                    <View style={styles.scanArea} />
                    <Text style={styles.overlayText}>
                        Position the QR code within the frame to automatically register your account.
                    </Text>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#9CC222" />
                        <Text style={styles.loadingText}>Registering Account...</Text>
                    </View>
                )}
            </View>

            {scanned && !loading && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                        <RefreshCw color="#000" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.rescanText}>Tap to Scan Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            <AlertComponent />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D0D' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { color: '#fff', fontSize: 16, marginBottom: 20 },
    btn: { backgroundColor: '#9CC222', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    btnText: { color: '#000', fontWeight: 'bold' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    backBtn: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

    cameraContainer: {
        flex: 1,
        overflow: 'hidden',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanArea: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#9CC222',
        backgroundColor: 'transparent',
        borderRadius: 20,
        marginBottom: 30,
    },
    overlayText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 40,
        opacity: 0.8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    loadingText: {
        color: '#9CC222',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 15,
    },
    bottomBar: {
        padding: 24,
        paddingBottom: 40,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
    },
    rescanBtn: {
        flexDirection: 'row',
        backgroundColor: '#9CC222',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    rescanText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
