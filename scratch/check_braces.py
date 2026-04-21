with open('src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"Open: {content.count('{')}")
    print(f"Close: {content.count('}')}")
