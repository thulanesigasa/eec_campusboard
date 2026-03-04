import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTheme } from '../../components/ThemeProvider';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { useThemedAlert } from '../../components/ThemedAlert';

const { width } = Dimensions.get('window');

export default function Login() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    const [userType, setUserType] = useState('Student');
    const [number, setNumber] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const { show: showAlert, AlertComponent } = useThemedAlert();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!number || !pin) {
            showAlert('Missing Fields', 'Please enter your number and pin.', 'warning');
            return;
        }

        if (pin.length !== 5 || pin.startsWith('0') || !/^\d+$/.test(pin)) {
            showAlert('Invalid Pin', 'Pin must be 5 numeric digits and cannot start with a 0.', 'warning');
            return;
        }

        setLoading(true);
        try {
            // TEST MODE: If the user enters exactly "11111", we simulate a successful login by bypassing Firebase 
            // and just routing them. (Warning: This is for testing only and disables actual auth checks for this PIN)
            if (pin === '11111') {
                (global as any).isTestAuth = true;
                router.replace('/(tabs)/feed');
                return;
            }

            const email = `${number.toLowerCase().trim()}@eec.edu.za`;
            await signInWithEmailAndPassword(auth, email, pin);
            router.replace('/(tabs)/feed');
        } catch (error: any) {
            showAlert('Login Failed', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const userTypes = ['Student', 'Personnel', 'Other', 'Alumni'];

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                    {/* Top section with branding */}
                    <Animated.View style={[styles.brandSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
                        <View style={styles.logoContainer}>
                            <Image source={require('../../assets/4398.png')} style={styles.logoImage} resizeMode="contain" />
                        </View>
                        <Text style={styles.tagline}>CampusBoard</Text>
                    </Animated.View>

                    {/* Form section */}
                    <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.welcomeText}>Welcome back</Text>
                        <Text style={styles.welcomeSub}>Sign in to continue</Text>

                        {/* User Type Radio Buttons */}
                        <View style={styles.radioGroup}>
                            {userTypes.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.radioContainer}
                                    onPress={() => setUserType(type)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.outerCircle, userType === type && styles.outerCircleSelected]}>
                                        {userType === type && <View style={styles.innerCircle} />}
                                    </View>
                                    <Text style={styles.radioLabel}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Number input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIcon}>
                                <User size={18} color={colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder={`${userType} Number`}
                                placeholderTextColor={colors.textSecondary}
                                value={number}
                                onChangeText={setNumber}
                                autoCapitalize="none"
                                keyboardType="default"
                            />
                        </View>

                        {/* Pin input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIcon}>
                                <Lock size={18} color={colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Pin (5 digits)"
                                placeholderTextColor={colors.textSecondary}
                                value={pin}
                                onChangeText={(text) => {
                                    if (/^\d{0,5}$/.test(text)) {
                                        setPin(text);
                                    }
                                }}
                                keyboardType="numeric"
                                secureTextEntry={!showPin}
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPin(!showPin)}>
                                {showPin ?
                                    <EyeOff size={18} color={colors.textSecondary} /> :
                                    <Eye size={18} color={colors.textSecondary} />
                                }
                            </TouchableOpacity>
                        </View>

                        {/* Login button */}
                        <TouchableOpacity
                            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <View style={styles.loginBtnContent}>
                                    <Text style={styles.loginBtnText}>Sign In</Text>
                                    <ArrowRight size={20} color="#000" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Bottom padding */}
                    <View style={styles.bottomSection} />
                </ScrollView>
            </KeyboardAvoidingView>
            <AlertComponent />
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },

    // Brand section
    brandSection: { alignItems: 'center', paddingTop: 40, marginBottom: 10 },
    logoContainer: {
        width: '100%',
        height: 180,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 8,
    },
    logoImage: { width: '80%', height: '100%' },
    tagline: { fontSize: 16, color: colors.danger, fontWeight: '600', fontStyle: 'italic', marginTop: 0, textAlign: 'center' },

    // Form section
    formSection: { paddingTop: 10 },
    welcomeText: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 4 },
    welcomeSub: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },

    // Radio
    radioGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 12,
        justifyContent: 'flex-start',
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    outerCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    outerCircleSelected: {
        borderColor: colors.accent,
    },
    innerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accent,
    },
    radioLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.border,
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
        height: 56,
    },
    inputIcon: { paddingLeft: 16, paddingRight: 4 },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text,
        height: '100%',
    },
    eyeBtn: { padding: 16 },

    loginBtn: {
        backgroundColor: colors.accent,
        borderRadius: 14,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    loginBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loginBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },

    // Bottom section
    bottomSection: { height: 40 },
});
