#!/usr/bin/env python3
import os
import re

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # 完整品牌名替换
        content = content.replace('雨姗AI收银助手', '雨姗AI收银助手')
        content = content.replace('雨姗AI收银助手', '雨姗AI收银助手')
        content = content.replace('', '')
        
        # 英文名称替换
        content = content.replace('yushan-ai-cashier-assistant', 'yushan-ai-cashier-assistant')
        content = content.replace('yushan-ai-cashier', 'yushan-ai-cashier')
        content = content.replace('yushan-ai-cashier', 'yushan-ai-cashier')
        content = content.replace('yushan', 'yushan')
        
        # 数据库相关
        content = content.replace('yushan_restaurant', 'yushan_restaurant')
        content = content.replace('yushan_app', 'yushan_app')
        
        # JWT密钥相关
        content = content.replace('yushan-ai-cashier-jwt-secret-key', 'yushan-ai-jwt-secret-key')
        content = content.replace('yushan-ai-cashier-secret-key', 'yushan-ai-jwt-secret-key')
        content = content.replace('yushan-ai-cashier-encryption-key', 'yushan-ai-encryption-key')
        
        # 容器名称
        content = content.replace('yushan-mysql', 'yushan-mysql')
        content = content.replace('yushan-redis', 'yushan-redis')
        content = content.replace('yushan-network', 'yushan-network')
        content = content.replace('yushan-nginx', 'yushan-nginx')
        
        # 管理员邮箱
        content = content.replace('admin@yushan.com', 'admin@yushan.com')
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'✓ {filepath}')
            return True
        return False
    except Exception as e:
        print(f'✗ {filepath}: {e}')
        return False

def main():
    extensions = ['.html', '.js', '.json', '.md', '.bat', '.yml', '.yaml', '.txt', '.env', '.sh', '.sql', '.py', '.dockerignore', '.gitignore']
    count = 0
    
    for root, dirs, files in os.walk('.'):
        # 跳过git和node_modules
        if '.git' in dirs:
            dirs.remove('.git')
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                if replace_in_file(filepath):
                    count += 1
    
    print(f'\n完成！共处理 {count} 个文件')

if __name__ == '__main__':
    main()
