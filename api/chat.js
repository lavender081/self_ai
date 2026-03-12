const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = 3001;

// 启用CORS
app.use(cors());
app.use(express.json());

// 模型配置
const modelConfig = {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk-6ffc26d9650f4aa9826ca89d439d67e5',
    model: 'qwen3-vl-flash'
};

// 系统提示词
const systemPrompt = `你是Lavender的数字分身，一个AI助手。请根据以下信息回答用户的问题：

关于Lavender：
- 名字：Lavender
- 身份：产品经理，正在学习AI
- 目前在做：整理数字分身的资料，搭建个人主页，整理作品集
- 兴趣：阅读，喜欢历史
- 擅长方向：产品设计、项目管理、解决方案输出
- 别人最可能问的问题：你做过什么？以后想要做什么？如何联系你？

请以Lavender的数字分身身份回答问题，保持语气友好、专业，提供准确的信息。`;

// 处理聊天请求
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: '请提供消息内容' });
        }
        
        // 调用API
        const response = await fetch(modelConfig.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${modelConfig.apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API调用失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error('API返回格式错误: 没有choices字段');
        }
        
        const botResponse = data.choices[0].message?.content;
        if (!botResponse) {
            throw new Error('API返回格式错误: 没有content字段');
        }
        
        res.json({ response: botResponse });
    } catch (error) {
        console.error('API调用错误:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
