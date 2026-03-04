import re
import os

files_to_refactor = [
    'app/(tabs)/feed.tsx',
    'app/(tabs)/profile.tsx',
    'app/(tabs)/chats.tsx',
    'app/(tabs)/search.tsx',
    'app/(tabs)/scan.tsx',
    'app/(auth)/login.tsx',
    'app/(auth)/register.tsx'
]

def replace_rgba(content):
    # Convert standard white opacities to theme variables
    content = content.replace("'rgba(255,255,255,0.15)'", "colors.border")
    content = content.replace("'rgba(255,255,255,0.2)'", "colors.border")
    content = content.replace("'rgba(255,255,255,0.25)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.3)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.35)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.4)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.5)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.6)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.7)'", "colors.textSecondary")
    content = content.replace("'rgba(255,255,255,0.8)'", "colors.text")
    content = content.replace("'rgba(255,255,255,0.85)'", "colors.text")
    content = content.replace("'rgba(255,255,255,0.9)'", "colors.text")
    
    # Same for double quotes
    content = content.replace('"rgba(255,255,255,0.1)"', "colors.border")
    content = content.replace('"rgba(255,255,255,0.15)"', "colors.border")
    content = content.replace('"rgba(255,255,255,0.2)"', "colors.border")
    content = content.replace('"rgba(255,255,255,0.25)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.3)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.35)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.4)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.5)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.6)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.7)"', "colors.textSecondary")
    content = content.replace('"rgba(255,255,255,0.8)"', "colors.text")
    content = content.replace('"rgba(255,255,255,0.85)"', "colors.text")
    content = content.replace('"rgba(255,255,255,0.9)"', "colors.text")

    return content

for file_path in files_to_refactor:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    new_content = replace_rgba(content)
    
    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Refactored opacities in {file_path}")
