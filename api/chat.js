const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = 3001;

// 🔴 关键修改1：从环境变量读取API密钥，移除硬编码
const apiKey = process.env.DASHSCOPE_API_KEY;
// 🔴 关键修改2：添加密钥缺失校验，启动时就报错，避免运行时异常
if (!apiKey) {
  console.error('❌ 错误：未配置 DASHSCOPE_API_KEY 环境变量！请先配置环境变量再启动服务。');
  process.exit(1); // 终止程序，防止无密钥运行
}

// 启用CORS
app.use(cors());
app.use(express.json());

// 模型配置（🔴 关键修改3：修正API URL为完整路径，原URL缺少/chat/completions）
const modelConfig = {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: apiKey, // 使用环境变量的密钥
    model: 'qwen3-vl-flash'
};

// 系统提示词（保持不变）
const systemPrompt = `你是Lavender的数字分身，一个AI助手。请根据以下信息回答用户的问题：

关于Lavender：
- 名字：Lavender
- 身份：产品经理，正在学习AI
- 目前在做：整理数字分身的资料，搭建个人主页，整理作品集
- 兴趣：阅读，喜欢历史
- 擅长方向：产品设计、项目管理、解决方案输出
- 别人最可能问的问题：你做过什么？以后想要做什么？如何联系你？

请以Lavender的数字分身身份回答问题，保持语气友好、专业，提供准确的信息。`;

// 处理聊天请求（逻辑完全保持不变）
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
