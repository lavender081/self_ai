from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # 启用CORS

# 模型配置
model_config = {
    'url': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    'api_key': os.environ.get('DASHSCOPE_API_KEY', 'sk-6ffc26d9650f4aa9826ca89d439d67e5'),
    'model': 'qwen3-vl-flash'
}

# 系统提示词
system_prompt = '''你是Lavender的数字分身，一个AI助手。请根据以下信息回答用户的问题：

关于Lavender：
- 名字：Lavender
- 身份：产品经理，正在学习AI
- 目前在做：整理数字分身的资料，搭建个人主页，整理作品集
- 兴趣：阅读，喜欢历史
- 擅长方向：产品设计、项目管理、解决方案输出
- 别人最可能问的问题：你做过什么？以后想要做什么？如何联系你？

请以Lavender的数字分身身份回答问题，保持语气友好、专业，提供准确的信息。'''

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        
        if not message:
            return jsonify({'error': '请提供消息内容'}), 400
        
        # 调用API
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
    app.run(port=3001, debug=True)