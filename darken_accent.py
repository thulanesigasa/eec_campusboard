import os

directories = ['app', 'components']

old_hex = "#C3E965"
new_hex = "#9CC222"

old_rgba = "195,233,101"
new_rgba = "156,194,34"

for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()

                new_content = content.replace(old_hex, new_hex)
                new_content = new_content.replace(old_rgba, new_rgba)

                if new_content != content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {path}")
