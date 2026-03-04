import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react-native';

export function useThemedAlert() {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({ title: '', message: '', type: 'info' });
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const show = (title, message, type = 'info') => {
        setConfig({ title, message, type });
        setVisible(true);
        scaleAnim.setValue(0.85);
        opacityAnim.setValue(0);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const hide = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => setVisible(false));
    };

    const getIcon = () => {
        const size = 36;
        switch (config.type) {
            case 'success': return <CheckCircle size={size} color="#9CC222" />;
            case 'error': return <XCircle size={size} color="#9CC222" />;
            case 'warning': return <AlertTriangle size={size} color="#9CC222" />;
            default: return <Info size={size} color="#9CC222" />;
        }
    };

    const AlertComponent = () => (
        <Modal visible={visible} transparent animationType="none" onRequestClose={hide}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.alertBox, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.iconWrap}>{getIcon()}</View>
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.message}>{config.message}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={hide}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );

    return { show, AlertComponent };
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    alertBox: {
        backgroundColor: '#141414',
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(156,194,34,0.15)',
    },
    iconWrap: { marginBottom: 16 },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        width: '100%',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#9CC222',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
});
