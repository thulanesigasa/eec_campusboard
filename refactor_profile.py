import re

with open('app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { useRouter, useFocusEffect } from 'expo-router';", "import { useRouter, useFocusEffect } from 'expo-router';\nimport { useTheme } from '../../components/ThemeProvider';")
content = content.replace("MessageCircle, ShieldCheck\n} from 'lucide-react-native';", "MessageCircle, ShieldCheck, Sun, Moon\n} from 'lucide-react-native';")

# 2. Add useTheme inside component
content = content.replace(
"""export default function Profile() {
    const router = useRouter();""",
"""export default function Profile() {
    const router = useRouter();
    const { isDark, toggleTheme, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);"""
)

# 3. Add toggle UI above Preferences -> Push Notifications
push_toggle = """                    <View style={styles.card}>
                        <TouchableOpacity style={styles.row} onPress={toggleTheme} activeOpacity={0.7}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.rowIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                    {isDark ? <Moon size={18} color={colors.text} /> : <Sun size={18} color={colors.text} />}
                                </View>
                                <View>
                                    <Text style={styles.rowLabel}>Dark Mode</Text>
                                    <Text style={styles.rowValue}>{isDark ? 'Enabled' : 'Disabled'}</Text>
                                </View>
                            </View>
                            <View style={[styles.toggle, isDark && styles.toggleOn]}>
                                <View style={[styles.toggleCircle, isDark && styles.toggleCircleOn]} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.row} onPress={() => setPushEnabled(!pushEnabled)} activeOpacity={0.7}>"""
content = content.replace("""                    <View style={styles.card}>
                        <TouchableOpacity style={styles.row} onPress={() => setPushEnabled(!pushEnabled)} activeOpacity={0.7}>""", push_toggle)

# 4. Refactor StyleSheet
content = content.replace("const styles = StyleSheet.create({", "const createStyles = (colors: any) => StyleSheet.create({")

# Replace colors in stylesheet
content = content.replace("'#141414'", "colors.card")
content = content.replace("'#0D0D0D'", "colors.background")
content = content.replace("'#fff'", "colors.text")
content = content.replace("'#ffffff'", "colors.text")
content = content.replace("'rgba(255,255,255,0.6)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.5)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.4)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.2)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.1)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.08)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.06)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.04)'", "colors.cardLight")
content = content.replace("'#ff6b6b'", "colors.danger")
content = content.replace("'rgba(255,107,107,0.2)'", "'rgba(255,107,107,0.1)'") 

with open('app/(tabs)/profile.tsx', 'w') as f:
    f.write(content)
print("Refactored profile.tsx")
