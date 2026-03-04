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

for file_path in files_to_refactor:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    # Look for prop=colors.propName and change to prop={colors.propName}
    new_content = re.sub(r'(\w+)=colors\.([a-zA-Z]+)', r'\1={colors.\2}', content)
    
    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Fixed JSX syntax in {file_path}")
