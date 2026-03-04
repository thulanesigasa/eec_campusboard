import re

with open('app/(tabs)/feed.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { useThemedAlert } from '../../components/ThemedAlert';", "import { useThemedAlert } from '../../components/ThemedAlert';\nimport { useTheme } from '../../components/ThemeProvider';")

# 2. Add useTheme inside component
content = content.replace(
"""export default function Feed() {
    const [posts, setPosts] = useState([]);""",
"""export default function Feed() {
    const { isDark, colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [posts, setPosts] = useState([]);"""
)

# 3. Refactor StyleSheet
content = content.replace("const styles = StyleSheet.create({", "const createStyles = (colors: any) => StyleSheet.create({")

# Replace colors in stylesheet
content = content.replace("'#141414'", "colors.card")
content = content.replace("'#0D0D0D'", "colors.background")
content = content.replace("'#fff'", "colors.text")
content = content.replace("'#ffffff'", "colors.text")
content = content.replace("'rgba(255,255,255,0.9)'", "colors.text")
content = content.replace("'rgba(255,255,255,0.7)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.6)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.5)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.4)'", "colors.textSecondary")
content = content.replace("'rgba(255,255,255,0.2)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.1)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.08)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.06)'", "colors.border")
content = content.replace("'rgba(255,255,255,0.05)'", "colors.cardLight")
content = content.replace("'rgba(255,255,255,0.04)'", "colors.cardLight")
content = content.replace("'#ff6b6b'", "colors.danger")
content = content.replace("backgroundColor: '#4A4A4A'", "backgroundColor: colors.border")

with open('app/(tabs)/feed.tsx', 'w') as f:
    f.write(content)
print("Refactored feed.tsx")
