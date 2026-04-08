import os
import re

# Define price mappings to reduce high prices to 2nd hand ranges
price_map = {
    '199': '129',
    '179': '109',
    '219': '139',
    '229': '149',
    '239': '149',
    '249': '159',
    '269': '159',
    '279': '169',
    '289': '179',
    '299': '189',
    '319': '209',
    '329': '219',
    '339': '229',
    '349': '249'
}

def fix_html(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 1. Fix the Rupee symbol mystery (8377 entity)
    content = content.replace('&#8377;', '₹')
    
    # 2. Fix the broken characters from previous attempts
    content = content.replace('?1', '₹1')
    content = content.replace('?2', '₹2')
    content = content.replace('?3', '₹3')
    content = content.replace('?7', '₹7')
    content = content.replace('?8', '₹8')
    content = content.replace('?9', '₹9')
    
    # 3. Lower the prices to 2nd hand ranges
    for old, new in price_map.items():
        # Match '₹' or '?' followed by old price
        content = content.replace(f'₹{old}', f'₹{new}')
        content = content.replace(f'&#8377;{old}', f'₹{new}')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

html_dir = 'frontend'
for filename in os.listdir(html_dir):
    if filename.endswith('.html'):
        fix_html(os.path.join(html_dir, filename))

print("Fixed symbols and prices in all HTML files.")
