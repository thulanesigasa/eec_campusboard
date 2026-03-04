import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Modal, FlatList,
    Animated, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, addDoc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../components/ThemeProvider';
import {
    ChevronDown, Search, X, School, User, Mail, Lock,
    ArrowRight, Eye, EyeOff, GraduationCap, UserPlus,
    Shield, ShieldCheck, QrCode
} from 'lucide-react-native';
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
    ],
    'FET Phase (Gr 10-12)': {
        'Compulsory': [
            'Home Language', 'First Additional Language', 'Mathematics',
            'Mathematical Literacy', 'Technical Mathematics', 'Life Orientation'
        ],
        'Commercial & Business': ['Accounting', 'Business Studies', 'Economics'],
        'Agricultural': ['Agricultural Management Practices', 'Agricultural Sciences', 'Agricultural Technology'],
        'Technical & Engineering': [
            'Civil Technology', 'Electrical Technology', 'Engineering Graphics and Design (EGD)',
            'Mechanical Technology', 'Technical Sciences'
        ],
        'Sciences': ['Life Sciences', 'Physical Sciences', 'Information Technology (IT)', 'Computer Applications Technology (CAT)'],
        'Social Sciences': ['Geography', 'History', 'Religion Studies', 'Tourism'],
        'Arts & Culture': [
            'Dance Studies', 'Design', 'Dramatic Arts', 'Music', 'Visual Arts',
            'Consumer Studies', 'Hospitality Studies'
        ]
    }
};

const PHASE_GRADES = {
    'Foundation Phase (Gr 1-3)': ['1', '2', '3'],
    'Intermediate Phase (Gr 4-6)': ['4', '5', '6'],
    'Senior Phase (Gr 7-9)': ['7', '8', '9'],
    'FET Phase (Gr 10-12)': ['10', '11', '12']
};

export default function Register() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    // Auth details
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Selection details
    const [topRole, setTopRole] = useState('Parent'); // Initial selection
    const [role, setRole] = useState('Parent');    // Final role for DB
    const [schoolId, setSchoolId] = useState('');
    const [schools, setSchools] = useState([]);
    const [selectedSchoolName, setSelectedSchoolName] = useState('');

    // School picker modal
    const [showSchoolPicker, setShowSchoolPicker] = useState(false);
    const [schoolSearch, setSchoolSearch] = useState('');

    // Learner details (If Parent)
    const [learnerFirstName, setLearnerFirstName] = useState('');
    const [learnerSurname, setLearnerSurname] = useState('');
    const [learnerGrade, setLearnerGrade] = useState('');
    const [selectedLearnerSubjects, setSelectedLearnerSubjects] = useState([]); // For Grade 10+ Learners

    // Teacher details
    const [selectedPhase, setSelectedPhase] = useState('');
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [staffTitle, setStaffTitle] = useState('Mr'); // New State

    const [loading, setLoading] = useState(false);
    const { show: showAlert, AlertComponent } = useThemedAlert();

    // Step navigation
    const [step, setStep] = useState(1);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const animateStep = () => {
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const schoolsRef = collection(db, 'schools');
            const q = query(schoolsRef, orderBy('name'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

            setSchools(data || []);
            if (data && data.length > 0) {
                setSchoolId(data[0].id);
                setSelectedSchoolName(data[0].name);
            }
        } catch (error) {
            console.error("Failed to fetch schools:", error);
        }
    };

    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(schoolSearch.toLowerCase())
    );

    const selectSchool = (school) => {
        setSchoolId(school.id);
        setSelectedSchoolName(school.name);
        setShowSchoolPicker(false);
        setSchoolSearch('');
    };

    const getSchoolType = (name) => {
        if (name.toLowerCase().includes('primary') || name.toLowerCase().includes('laerskool')) return 'Primary';
        if (name.toLowerCase().includes('secondary') || name.toLowerCase().includes('high') || name.toLowerCase().includes('hoÃ«rskool')) return 'Secondary';
        if (name.toLowerCase().includes('combined')) return 'Combined';
        return 'Other';
    };

    const getTypeBadgeColor = (type) => {
        switch (type) {
            case 'Primary': return { bg: 'rgba(156,194,34,0.15)', text: '#9CC222' };
            case 'Secondary': return { bg: 'rgba(96,165,250,0.15)', text: '#60A5FA' };
            case 'Combined': return { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24' };
            default: return { bg: colors.border, text: colors.textSecondary };
        }
    };

    const goToStep2 = () => {
        if (!firstName || !surname) {
            showAlert('Missing Fields', 'Please enter your name.', 'warning');
            return;
        }
        if (!schoolId) {
            showAlert('Missing Fields', 'Please select a school.', 'warning');
            return;
        }
        setStep(2);
        animateStep();
    };

    const goToStep3 = () => {
        if (!email || !password) {
            showAlert('Missing Fields', 'Please enter email and password.', 'warning');
            return;
        }
        if (password.length < 6) {
            showAlert('Weak Password', 'Password must be at least 6 characters.', 'warning');
            return;
        }
        if (role === 'Parent') {
            setStep(3);
            animateStep();
        } else {
            handleRegister();
        }
    };

    const toggleSubject = (sub) => {
        if (selectedSubjects.includes(sub)) {
            setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
        } else {
            setSelectedSubjects([...selectedSubjects, sub]);
        }
    };

    const toggleGrade = (grade) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(selectedGrades.filter(g => g !== grade));
        } else {
            setSelectedGrades([...selectedGrades, grade]);
        }
    };

    const toggleLearnerSubject = (sub) => {
        if (selectedLearnerSubjects.includes(sub)) {
            setSelectedLearnerSubjects(selectedLearnerSubjects.filter(s => s !== sub));
        } else {
            setSelectedLearnerSubjects([...selectedLearnerSubjects, sub]);
        }
    };

    const isFetPhase = () => {
        const gradeInt = parseInt(learnerGrade, 10);
        return gradeInt >= 10 && gradeInt <= 12;
    };

    const handleRegister = async () => {
        if (role === 'Parent' && (!learnerFirstName || !learnerSurname || !learnerGrade)) {
            showAlert('Missing Fields', 'Please fill in all learner details.', 'warning');
            return;
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.id || userCredential.user.uid;

            // Create profile manually
            await setDoc(doc(db, 'profiles', userId), {
                id: userId,
                role,
                title: role !== 'Parent' ? staffTitle : null,
                first_name: firstName,
                surname,
                school_id: schoolId,
                subjects: role !== 'Parent' ? selectedSubjects : [],
                grades: role !== 'Parent' ? selectedGrades : [],
                phase: role !== 'Parent' ? selectedPhase : null
            });

            // Handle Group Chats (Auto-creation & Joining)
            if (role !== 'Parent') {
                // All Staff join the Community Chat
                const communityName = 'Community';

                const groupsRef = collection(db, 'chat_groups');
                const qComm = query(groupsRef, where('school_id', '==', schoolId), where('name', '==', communityName));
                const commSnapshot = await getDocs(qComm);

                let commGroupId;

                if (commSnapshot.empty) {
                    const newCommRef = await addDoc(collection(db, 'chat_groups'), {
                        school_id: schoolId,
                        name: communityName
                    });
                    commGroupId = newCommRef.id;
                } else {
                    commGroupId = commSnapshot.docs[0].id;
                }

                if (commGroupId) {
                    await addDoc(collection(db, 'chat_participants'), {
                        group_id: commGroupId,
                        user_id: userId,
                        role: (role === 'Principal' || role === 'Vice Principal') ? 'admin' : 'member'
                    });
                }
            }

            if (role === 'Teacher') {
                for (const grade of selectedGrades) {
                    for (const subject of selectedSubjects) {
                        const chatName = `Grade ${grade} - ${subject}`;

                        // Check if chat exists
                        const chatRef = collection(db, 'chat_groups');
                        const qChat = query(chatRef, where('school_id', '==', schoolId), where('name', '==', chatName));
                        const chatSnapshot = await getDocs(qChat);

                        let groupId;

                        if (chatSnapshot.empty) {
                            // Create chat
                            const newChatRef = await addDoc(collection(db, 'chat_groups'), {
                                school_id: schoolId,
                                name: chatName
                            });
                            groupId = newChatRef.id;

                            // Retroactive Join: Add existing parents of this grade & subject
                            const numGrade = parseInt(grade, 10);

                            const learnersRef = collection(db, 'learners');
                            const qLearner = query(learnersRef, where('grade', '==', grade), where('school_id', '==', schoolId));
                            const learnerSnapshot = await getDocs(qLearner);

                            if (!learnerSnapshot.empty) {
                                const parentsToAdd = new Set();

                                learnerSnapshot.forEach(docSnap => {
                                    const learner = docSnap.data();
                                    if (learner.parent_id) {
                                        if (numGrade >= 10) {
                                            if (learner.subjects && learner.subjects.includes(subject)) {
                                                parentsToAdd.add(learner.parent_id);
                                            }
                                        } else {
                                            parentsToAdd.add(learner.parent_id);
                                        }
                                    }
                                });

                                // Filter out nulls just in case and create participants
                                for (const parentId of Array.from(parentsToAdd).filter(Boolean)) {
                                    await addDoc(collection(db, 'chat_participants'), {
                                        group_id: groupId,
                                        user_id: parentId,
                                        role: 'member'
                                    });
                                }
                            }
                        } else {
                            groupId = chatSnapshot.docs[0].id;
                        }

                        if (groupId) {
                            // Add teacher as admin
                            await addDoc(collection(db, 'chat_participants'), {
                                group_id: groupId,
                                user_id: userId,
                                role: 'admin'
                            });
                        }
                    }
                }
            } else if (role === 'Parent') {
                await addDoc(collection(db, 'learners'), {
                    first_name: learnerFirstName,
                    surname: learnerSurname,
                    grade: learnerGrade,
                    parent_id: userId,
                    school_id: schoolId,
                    subjects: isFetPhase() ? selectedLearnerSubjects : []
                });

                // Auto-join Parent to existing relevant chats
                const numGrade = parseInt(learnerGrade, 10);
                const subjectsToCheck = isFetPhase() ? selectedLearnerSubjects : CURRICULUM_DATA[
                    numGrade <= 3 ? 'Foundation Phase (Gr 1-3)' :
                        numGrade <= 6 ? 'Intermediate Phase (Gr 4-6)' :
                            'Senior Phase (Gr 7-9)'
                ];

                if (subjectsToCheck && Array.isArray(subjectsToCheck)) {
                    for (const subject of subjectsToCheck) {
                        const chatName = `Grade ${learnerGrade} - ${subject}`;

                        const groupRef = collection(db, 'chat_groups');
                        const qGroup = query(groupRef, where('school_id', '==', schoolId), where('name', '==', chatName));
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
            }

            showAlert('Success', 'Account created successfully!', 'success');
            router.replace('/(tabs)/feed');
        } catch (error) {
            showAlert('Registration Failed', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalSteps = role === 'Parent' ? 3 : 2;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoRow}>
                            <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
                            <Text style={styles.appName}>Cxnnect</Text>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBar}>
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <View key={i} style={[
                                    styles.progressDot,
                                    i + 1 <= step && styles.progressDotActive,
                                    i + 1 < step && styles.progressDotDone
                                ]} />
                            ))}
                        </View>
                        <Text style={styles.stepLabel}>Step {step} of {totalSteps}</Text>
                    </View>

                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                        {/* STEP 1: Profile Info */}
                        {step === 1 && (
                            <View>
                                <Text style={styles.stepTitle}>Let's get started</Text>
                                <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

                                {/* Primary Role selector */}
                                <Text style={styles.fieldLabel}>I am a</Text>
                                <View style={styles.roleGrid}>
                                    {[
                                        { id: 'Parent', label: 'Parent', icon: UserPlus },
                                        { id: 'Teacher', label: 'Teacher/Staff', icon: GraduationCap },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        const isActive = topRole === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive]}
                                                onPress={() => {
                                                    setTopRole(item.id);
                                                    setRole(item.id); // Default sub-role
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Icon size={18} color={isActive ? '#000' : colors.textSecondary} />
                                                <Text style={[styles.roleGridText, isActive && styles.roleGridTextActive]}>{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Sub-Role selector (Only if Teacher/Staff is selected) */}
                                {topRole === 'Teacher' && (
                                    <>
                                        <Text style={styles.fieldLabel}>Title</Text>
                                        <View style={styles.roleGrid}>
                                            {['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'].map((t) => {
                                                const isActive = staffTitle === t;
                                                return (
                                                    <TouchableOpacity
                                                        key={t}
                                                        style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive, { width: '31%', height: 44, marginBottom: 8 }]}
                                                        onPress={() => setStaffTitle(t)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.roleGridText, { fontSize: 13 }, isActive && styles.roleGridTextActive]}>{t}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <Text style={styles.fieldLabel}>Specific Role</Text>
                                        <View style={styles.roleGrid}>
                                            {[
                                                { id: 'Teacher', label: 'Teacher', icon: GraduationCap },
                                                { id: 'Principal', label: 'Principal', icon: ShieldCheck },
                                                { id: 'Vice Principal', label: 'VP', icon: Shield },
                                            ].map((item) => {
                                                const Icon = item.icon;
                                                const isActive = role === item.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive, { width: '31%' }]}
                                                        onPress={() => setRole(item.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Icon size={16} color={isActive ? '#000' : colors.textSecondary} />
                                                        <Text style={[styles.roleGridText, { fontSize: 12 }, isActive && styles.roleGridTextActive]}>{item.label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}

                                {role === 'Teacher' && (
                                    <>
                                        <Text style={styles.fieldLabel}>Teaching Phase</Text>
                                        <View style={styles.roleGrid}>
                                            {Object.keys(CURRICULUM_DATA).map((phase) => {
                                                const isActive = selectedPhase === phase;
                                                const label = phase.split(' ')[0];
                                                return (
                                                    <TouchableOpacity
                                                        key={phase}
                                                        style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive]}
                                                        onPress={() => {
                                                            setSelectedPhase(phase);
                                                            setSelectedSubjects([]);
                                                            setSelectedGrades([]);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.roleGridText, isActive && styles.roleGridTextActive]}>{label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}

                                {role === 'Teacher' && selectedPhase && (
                                    <>
                                        <Text style={styles.fieldLabel}>Grades ({selectedPhase.split('(')[0].trim()})</Text>
                                        <View style={styles.roleGrid}>
                                            {PHASE_GRADES[selectedPhase].map((gradeStr) => {
                                                const isActive = selectedGrades.includes(gradeStr);
                                                return (
                                                    <TouchableOpacity
                                                        key={gradeStr}
                                                        style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive, { width: '31%', height: 44, marginBottom: 8 }]}
                                                        onPress={() => toggleGrade(gradeStr)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.roleGridText, { fontSize: 13 }, isActive && styles.roleGridTextActive]}>Grade {gradeStr}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}

                                {role === 'Teacher' && selectedPhase && (
                                    <>
                                        <Text style={styles.fieldLabel}>Subjects ({selectedPhase.split('(')[0].trim()})</Text>
                                        <View style={styles.subjectsContainer}>
                                            {Array.isArray(CURRICULUM_DATA[selectedPhase]) ? (
                                                <View style={styles.subjectGrid}>
                                                    {CURRICULUM_DATA[selectedPhase].map((sub) => {
                                                        const isSelected = selectedSubjects.includes(sub);
                                                        return (
                                                            <TouchableOpacity
                                                                key={sub}
                                                                style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                                                                onPress={() => toggleSubject(sub)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>{sub}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            ) : (
                                                (Object.entries(CURRICULUM_DATA[selectedPhase]) as [string, string[]][]).map(([category, subjects]) => (
                                                    <View key={category} style={styles.subjectCategoryWrap}>
                                                        <Text style={styles.subjectCategoryTitle}>{category}</Text>
                                                        <View style={styles.subjectGrid}>
                                                            {subjects.map((sub) => {
                                                                const isSelected = selectedSubjects.includes(sub);
                                                                return (
                                                                    <TouchableOpacity
                                                                        key={sub}
                                                                        style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                                                                        onPress={() => toggleSubject(sub)}
                                                                        activeOpacity={0.7}
                                                                    >
                                                                        <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>{sub}</Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    </>
                                )}

                                {role !== 'Parent' && (
                                    <>
                                        <Text style={styles.fieldLabel}>Title</Text>
                                        <View style={[styles.roleGrid, { marginBottom: 12 }]}>
                                            {['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Rev'].map((t) => {
                                                const isActive = staffTitle === t;
                                                return (
                                                    <TouchableOpacity
                                                        key={t}
                                                        style={[styles.roleGridBtn, isActive && styles.roleGridBtnActive, { width: '31%', height: 44, marginBottom: 8 }]}
                                                        onPress={() => setStaffTitle(t)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.roleGridText, { fontSize: 13 }, isActive && styles.roleGridTextActive]}>{t}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}

                                {/* Name inputs */}
                                <Text style={styles.fieldLabel}>Full name</Text>
                                <View style={styles.nameRow}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                                        <TextInput style={styles.input} placeholder="First name" placeholderTextColor={colors.textSecondary} value={firstName} onChangeText={setFirstName} />
                                    </View>
                                    <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                                        <TextInput style={styles.input} placeholder="Surname" placeholderTextColor={colors.textSecondary} value={surname} onChangeText={setSurname} />
                                    </View>
                                </View>

                                {/* School selector */}
                                <Text style={styles.fieldLabel}>School</Text>
                                <TouchableOpacity
                                    style={styles.schoolSelector}
                                    onPress={() => setShowSchoolPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.schoolSelectorLeft}>
                                        <School size={18} color="#9CC222" />
                                        <Text style={styles.schoolSelectorValue} numberOfLines={1}>
                                            {selectedSchoolName || 'Select a school...'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={18} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.nextBtn} onPress={goToStep2} activeOpacity={0.85}>
                                    <Text style={styles.nextBtnText}>Continue</Text>
                                    <ArrowRight size={20} color="#000" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 2: Account Details */}
                        {step === 2 && (
                            <View>
                                <Text style={styles.stepTitle}>Create your account</Text>
                                <Text style={styles.stepSubtitle}>Set up your login credentials</Text>

                                <Text style={styles.fieldLabel}>Email</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconWrap}>
                                        <Mail size={18} color={colors.textSecondary} />
                                    </View>
                                    <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                                </View>

                                <Text style={styles.fieldLabel}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconWrap}>
                                        <Lock size={18} color={colors.textSecondary} />
                                    </View>
                                    <TextInput style={styles.input} placeholder="Min 6 characters" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(1); animateStep(); }} activeOpacity={0.7}>
                                        <Text style={styles.backBtnText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.nextBtn, { flex: 1, marginLeft: 12 }]} onPress={goToStep3} activeOpacity={0.85}>
                                        {loading && role !== 'Parent' ? <ActivityIndicator color="#000" /> : (
                                            <View style={styles.nextBtnContent}>
                                                <Text style={styles.nextBtnText}>{role === 'Parent' ? 'Continue' : 'Create Account'}</Text>
                                                <ArrowRight size={20} color="#000" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* STEP 3: Learner Details (Parents only) */}
                        {step === 3 && (
                            <View>
                                <Text style={styles.stepTitle}>Add your child</Text>
                                <Text style={styles.stepSubtitle}>Enter your learner's details</Text>

                                <Text style={styles.fieldLabel}>Learner's name</Text>
                                <View style={styles.nameRow}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                                        <TextInput style={styles.input} placeholder="First name" placeholderTextColor={colors.textSecondary} value={learnerFirstName} onChangeText={setLearnerFirstName} />
                                    </View>
                                    <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                                        <TextInput style={styles.input} placeholder="Surname" placeholderTextColor={colors.textSecondary} value={learnerSurname} onChangeText={setLearnerSurname} />
                                    </View>
                                </View>

                                <Text style={styles.fieldLabel}>Grade</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconWrap}>
                                        <GraduationCap size={18} color={colors.textSecondary} />
                                    </View>
                                    <TextInput style={styles.input} placeholder="e.g. 4" placeholderTextColor={colors.textSecondary} value={learnerGrade} onChangeText={(text) => {
                                        setLearnerGrade(text);
                                        if (parseInt(text, 10) < 10) setSelectedLearnerSubjects([]);
                                    }} keyboardType="number-pad" />
                                </View>

                                {isFetPhase() && (
                                    <>
                                        <Text style={styles.fieldLabel}>Subjects (FET Phase)</Text>
                                        <View style={styles.subjectsContainer}>
                                            {(Object.entries(CURRICULUM_DATA['FET Phase (Gr 10-12)']) as [string, string[]][]).map(([category, subjects]) => (
                                                <View key={category} style={styles.subjectCategoryWrap}>
                                                    <Text style={styles.subjectCategoryTitle}>{category}</Text>
                                                    <View style={styles.subjectGrid}>
                                                        {subjects.map((sub) => {
                                                            const isSelected = selectedLearnerSubjects.includes(sub);
                                                            return (
                                                                <TouchableOpacity
                                                                    key={sub}
                                                                    style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                                                                    onPress={() => toggleLearnerSubject(sub)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>{sub}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(2); animateStep(); }} activeOpacity={0.7}>
                                        <Text style={styles.backBtnText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.nextBtn, { flex: 1, marginLeft: 12 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                                        {loading ? <ActivityIndicator color="#000" /> : (
                                            <View style={styles.nextBtnContent}>
                                                <Text style={styles.nextBtnText}>Create Account</Text>
                                                <ArrowRight size={20} color="#000" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* Bottom */}
                    <View style={styles.bottomSection}>
                        <TouchableOpacity
                            style={styles.qrBtn}
                            onPress={() => router.push('/(auth)/qr-register')}
                            activeOpacity={0.85}
                        >
                            <QrCode size={20} color="#fff" />
                            <Text style={styles.qrBtnText}>Scan QR Code to Register instead</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7} style={{ marginTop: 20 }}>
                            <Text style={styles.bottomText}>
                                Already have an account? <Text style={styles.bottomLink}>Sign in</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* School Picker Modal */}
            <Modal visible={showSchoolPicker} animationType="slide" transparent onRequestClose={() => setShowSchoolPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select School</Text>
                            <TouchableOpacity onPress={() => { setShowSchoolPicker(false); setSchoolSearch(''); }} style={styles.modalClose}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchBar}>
                            <Search size={18} color={colors.textSecondary} />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search schools..."
                                placeholderTextColor={colors.textSecondary}
                                value={schoolSearch}
                                onChangeText={setSchoolSearch}
                                autoFocus
                            />
                            {schoolSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setSchoolSearch('')}>
                                    <X size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.resultsCount}>
                            {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
                        </Text>

                        <FlatList
                            data={filteredSchools}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const type = getSchoolType(item.name);
                                const badge = getTypeBadgeColor(type);
                                const selected = item.id === schoolId;

                                return (
                                    <TouchableOpacity
                                        style={[styles.schoolItem, selected && styles.schoolItemSelected]}
                                        onPress={() => selectSchool(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.schoolItemLeft}>
                                            <View style={[styles.schoolIconWrap, selected && { backgroundColor: 'rgba(156,194,34,0.2)' }]}>
                                                <School size={18} color={selected ? '#9CC222' : colors.textSecondary} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.schoolName, selected && { color: '#9CC222' }]} numberOfLines={1}>{item.name}</Text>
                                                <Text style={styles.schoolLocation}>Standerton, Mpumalanga</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.typeBadgeText, { color: badge.text }]}>{type}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyList}>
                                    <Search size={28} color={colors.border} />
                                    <Text style={styles.emptyText}>No schools found</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
            <AlertComponent />
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 16, flexGrow: 1 },

    // Header
    header: { alignItems: 'center', marginBottom: 32, paddingTop: 20 },
    logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    logoImage: { width: 30, height: 30, borderRadius: 8, marginRight: 8 },
    appName: { fontSize: 22, fontWeight: '700', color: colors.text },

    progressBar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    progressDot: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.border,
    },
    progressDotActive: { backgroundColor: '#9CC222' },
    progressDotDone: { backgroundColor: 'rgba(156,194,34,0.4)' },
    stepLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

    // Step content
    stepTitle: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 4 },
    stepSubtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 28 },

    fieldLabel: {
        fontSize: 13, fontWeight: '600', color: colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },

    // Inputs
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.border,
        borderRadius: 14, marginBottom: 16,
        borderWidth: 1, borderColor: colors.border,
        height: 54,
    },
    inputIconWrap: { paddingLeft: 16, paddingRight: 4 },
    input: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: colors.text, height: '100%' },
    eyeBtn: { padding: 16 },
    nameRow: { flexDirection: 'row' },

    // Role Grid
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24
    },
    roleGridBtn: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border,
        borderRadius: 14,
        height: 54,
        gap: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    roleGridBtnActive: {
        backgroundColor: '#9CC222',
        borderColor: '#9CC222'
    },
    roleGridText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary
    },
    roleGridTextActive: {
        color: '#000'
    },

    // Subject selection
    subjectsContainer: {
        marginBottom: 20,
    },
    subjectCategoryWrap: {
        marginBottom: 16,
    },
    subjectCategoryTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        paddingLeft: 4,
    },
    subjectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8
    },
    subjectChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.cardLight,
        borderWidth: 1,
        borderColor: colors.border,
    },
    subjectChipActive: {
        backgroundColor: 'rgba(156,194,34,0.1)',
        borderColor: 'rgba(156,194,34,0.3)',
    },
    subjectChipText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    subjectChipTextActive: {
        color: '#9CC222',
        fontWeight: '700'
    },

    // Role selector
    roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    roleBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.border,
        borderRadius: 14, height: 54, gap: 8,
        borderWidth: 1.5, borderColor: colors.border,
    },
    roleBtnActive: { backgroundColor: '#9CC222', borderColor: '#9CC222' },
    roleBtnText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    roleBtnTextActive: { color: '#000' },

    // School selector
    schoolSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.border, borderRadius: 14,
        height: 54, paddingHorizontal: 16, marginBottom: 24,
        borderWidth: 1, borderColor: colors.border,
    },
    schoolSelectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    schoolSelectorValue: { fontSize: 16, color: colors.text, marginLeft: 12, flex: 1 },

    // Buttons
    nextBtn: {
        backgroundColor: '#9CC222', borderRadius: 14, height: 54,
        justifyContent: 'center', alignItems: 'center',
    },
    nextBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nextBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },
    btnRow: { flexDirection: 'row', marginTop: 8 },
    backBtn: {
        backgroundColor: colors.border, borderRadius: 14,
        height: 54, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    backBtnText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

    // Bottom
    bottomSection: { alignItems: 'center', paddingVertical: 24 },
    bottomText: { fontSize: 15, color: colors.textSecondary },
    bottomLink: { color: '#9CC222', fontWeight: '600' },

    // QR Button
    qrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        height: 54,
        width: '100%',
        gap: 12,
    },
    qrBtnText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        height: '85%', paddingTop: 8,
    },
    modalHandle: {
        width: 36, height: 4, backgroundColor: colors.border,
        borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    modalClose: { padding: 4 },
    modalSearchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.border, marginHorizontal: 20,
        marginTop: 12, borderRadius: 12, paddingHorizontal: 14, height: 46,
        borderWidth: 1, borderColor: colors.border,
    },
    modalSearchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: colors.text },
    resultsCount: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },

    // School list
    schoolItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 13, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    schoolItemSelected: { backgroundColor: 'rgba(156,194,34,0.06)' },
    schoolItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    schoolIconWrap: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    schoolName: { fontSize: 15, color: colors.text, fontWeight: '500' },
    schoolLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
    typeBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    emptyList: { alignItems: 'center', paddingTop: 50 },
    emptyText: { color: colors.textSecondary, fontSize: 15, marginTop: 10 },
});
