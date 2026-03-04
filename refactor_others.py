import re
import os

files_to_refactor = [
    'app/(tabs)/chats.tsx',
    'app/(tabs)/scan.tsx',
    'app/(tabs)/search.tsx',
    'app/(auth)/login.tsx',
    'app/(auth)/register.tsx'
]

for file_path in files_to_refactor:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    # 1. Imports
    if "import { useTheme }" not in content:
        content = content.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { useTheme } from '../../components/ThemeProvider';")

    # 2. Add useTheme inside component
    func_match = re.search(r'export default function \w+\(\) \{', content)
    if func_match:
        func_dec = func_match.group(0)
        if "useTheme()" not in content:
            content = content.replace(
                func_dec,
                f"{func_dec}\n    const {{ isDark, colors }} = useTheme();\n    const styles = React.useMemo(() => createStyles(colors), [colors]);"
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

    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Refactored {file_path}")
