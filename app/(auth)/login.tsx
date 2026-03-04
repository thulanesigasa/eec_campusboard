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
import { Mail, Lock, ArrowRight, Eye, EyeOff, QrCode } from 'lucide-react-native';
import { useThemedAlert } from '../../components/ThemedAlert';

const { width } = Dimensions.get('window');

export default function Login() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
        if (!email || !password) {
            showAlert('Missing Fields', 'Please enter both email and password.', 'warning');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)/feed');
        } catch (error) {
            showAlert('Login Failed', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                    {/* Top section with branding */}
                    <Animated.View style={[styles.brandSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
                        <View style={styles.logoContainer}>
                            <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
                        </View>
                        <Text style={styles.appName}>Cxnnect</Text>
                        <Text style={styles.tagline}>Your school community, connected</Text>
                    </Animated.View>

                    {/* Form section */}
                    <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.welcomeText}>Welcome back</Text>
                        <Text style={styles.welcomeSub}>Sign in to continue</Text>

                        {/* Email input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIcon}>
                                <Mail size={18} color={colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* Password input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIcon}>
                                <Lock size={18} color={colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ?
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

                    {/* Bottom link */}
                    <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
                            <Text style={styles.bottomText}>
                                Don't have an account? <Text style={styles.bottomLink}>Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
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
    brandSection: { alignItems: 'center', paddingTop: 60 },
    logoContainer: {
        width: 80, height: 80,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    logoImage: { width: 70, height: 70, borderRadius: 16 },
    appName: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },

    // Form section
    formSection: { paddingTop: 10 },
    welcomeText: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 4 },
    welcomeSub: { fontSize: 15, color: colors.textSecondary, marginBottom: 28 },

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
        backgroundColor: '#9CC222',
        borderRadius: 14,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    loginBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loginBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },

    // QR Button & Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        color: colors.textSecondary,
        paddingHorizontal: 12,
        fontSize: 12,
        fontWeight: '600',
    },
    qrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        height: 56,
        gap: 12,
        marginTop: 4,
    },
    qrBtnText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },

    // Bottom section
    bottomSection: { alignItems: 'center', paddingBottom: 20 },
    bottomText: { fontSize: 15, color: colors.textSecondary },
    bottomLink: { color: '#9CC222', fontWeight: '600' },
});
