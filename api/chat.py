from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import sys  # 新增：用于终止程序

app = Flask(__name__)
CORS(app)  # 启用CORS

# 🔴 关键修改1：读取环境变量（移除默认硬编码密钥）
api_key = os.environ.get('DASHSCOPE_API_KEY')
# 🔴 关键修改2：启动时校验密钥，缺失则直接报错并终止程序
if not api_key:
    print('❌ 错误：未配置 DASHSCOPE_API_KEY 环境变量！请先配置环境变量再启动服务。', file=sys.stderr)
    sys.exit(1)  # 终止程序，防止无密钥运行

# 提供静态文件服务（保持不变）
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_file(path):
    return send_from_directory('.', path)

# 模型配置（🔴 关键修改3：使用校验后的api_key，无默认值）
model_config = {
    'url': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    'api_key': api_key,  # 仅使用环境变量的密钥
    'model': 'qwen3-vl-flash'
}

# 系统提示词（保持不变）
system_prompt = '''你是Lavender的数字分身，用来在个人主页里回答访客关于Lavender的问题。

你的任务：
- 介绍Lavender是谁
- 回答和Lavender有关的问题
- 帮访客了解Lavender最近在做什么、做过什么、怎么联系她

关于Lavender：
- Lavender是一个正在学习AI的业务人员，希望通过AI给自己的产品管理、项目管理、解决方案等工作内容进行赋能
- Lavender最近在做：用AI搭建个人数字页面
- Lavender擅长或长期关注：比较擅长业务知识学习整合，把复杂问题讲清楚，也比较关注AI应用方向

说话方式：
- 语气：专业
- 回答尽量：简洁 / 真诚 / 人话一点 / 不装专家

边界：
- 不要编造Lavender没做过的经历
- 不要假装知道Lavender没提供的信息
- 不知道时要明确说不知道，并建议访客通过联系方式进一步确认

联系方式：17816872286@163.com

请以Lavender的数字分身身份回答问题，保持语气专业、简洁、真诚，提供准确的信息。'''

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        
        if not message:
            return jsonify({'error': '请提供消息内容'}), 400
        
        # 调用API（逻辑保持不变）
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {model_config["api_key"]}'
        }
        
        payload = {
            'model': model_config['model'],
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': message}
            ],
            'temperature': 0.7
        }
        
        print(f'调用API: {model_config["url"]}')
        print(f'Headers: {headers}')
        print(f'Payload: {payload}')
        
        response = requests.post(model_config['url'], headers=headers, json=payload)
        
        print(f'Response status: {response.status_code}')
        print(f'Response headers: {dict(response.headers)}')
        print(f'Response content: {response.text}')
        
        if not response.ok:
            try:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', '未知错误')
            except:
                error_data = {}
                error_message = '未知错误'
            raise Exception(f'API调用失败: {response.status_code} - {error_message}')
        
        data = response.json()
        print(f'API响应数据: {data}')
        
        if not data.get('choices') or len(data['choices']) == 0:
            raise Exception('API返回格式错误: 没有choices字段')
        
        bot_response = data['choices'][0].get('message', {}).get('content')
        if not bot_response:
            raise Exception('API返回格式错误: 没有content字段')
        
        return jsonify({'response': bot_response})
    except Exception as e:
        print(f'API调用错误: {str(e)}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 本地运行时启动服务（保持不变）
    app.run(host='0.0.0.0', port=3000, debug=False)
