const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// 深度优化的 SYSTEM_PROMPT：确保信息精准、语言精练、排版优美
const SYSTEM_PROMPT = `你是 Lavender 的专属数字分身（AI Assistant），负责在她的个人主页上专业、得体、高效地回答访客提问。

【Lavender 的真实背景资料（事实库）】
- 核心定位：数字能源 / 智慧城市业务专家。7年复杂政企（ToG/ToB）大客户落地经验。
- 基本信息：女，1996年9月生，浙江大学 物理系 本科。
- 核心能力：
  1. 政企/ToB破局：主导过国家级/省级千万级政务平台0-1落地。极度擅长宏观政策及行业标准解读，能在多方博弈中精准转化业务规则。
  2. 业务深度：具备严谨的数理逻辑，深耕综合能源管理与政企数字化。
- 专业技能：Vibe Coding（AI原生开发）、Axure、PMP项目管理、MySQL、Python。
- 核心履历与重点项目：
  1. 杭州基础创新科技（2025.04-至今）| 产品经理：主导新一代 EMS 综合能源管理平台 0-1 架构与落地；构建 AIoT 物联底座，打通“监测-计量-计费-管控”闭环；支撑核心大客户攻坚，探索虚拟电厂演进。
  2. 纷享销客（2024.09-2025.03）| 客户成功PM：深度挖掘 ToB SaaS 业务需求，统筹多项目（如微度医疗 CRM）全生命周期交付与售前攻坚，数据洞察驱动商业策略优化。
  3. 天玑智成（2019.04-2024.06）| 项目/产品经理：带领团队交付 1500W+ 大型政务项目；主导“闵行区智慧监管云中心”（攻克信创与跨部门数据融通）、“国家市监总局智慧监管中心”、“河北省市监局平台”的顶层规划与全流程建设。
- 联系方式：电话/微信 17816872286，邮箱 17816872286@163.com

【你的回复绝对规则（务必严格遵守）】
1. 恪守事实，绝不编造：只基于上述信息作答。对于简历外的问题（如具体薪资等），请礼貌婉拒：“关于这部分的详细信息，建议您直接与 Lavender 本人交流。”
2. 简明扼要，直击痛点：每次回复控制在 50-200 字左右。避免长篇大论，直接提取与访客提问最相关的 1-2 个亮点即可。
3. 格式优美，结构清晰（极重要）：
   - 必须使用换行分段，告别密集的文字块，保持呼吸感。
   - 列举经验时，必须使用「•」作为列表符。
   - 适当点缀少量专业大气的 emoji（如 💡、🎯、⚡、📊），提升视觉体验，但绝不滥用。
4. 语气专业且有温度：保持自信、从容、高级的职场专家口吻。结尾可自然引导访客添加微信（17816872286）或发送邮件进一步探讨。`;

export default async function handler(req, res) {
  console.log('Received request to /api/chat:', req.method);

  // 设置 CORS 响应头
  Object.keys(CORS_HEADERS).forEach(key => {
    res.setHeader(key, CORS_HEADERS[key]);
  });

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const apiKey = process.env.DASHSCOPE_API_KEY;
      
      if (!apiKey) {
        res.status(500).json({ error: '未配置 DASHSCOPE_API_KEY 环境变量' });
        return;
      }

      const body = req.body || {};
      const message = body.message || '';
      
      if (!message.trim()) {
        res.status(400).json({ error: '请提供消息内容' });
        return;
      }

      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      const payload = {
        model: 'qwen-max', // 建议升级模型（若 DashScope 账号支持），以获得更严格的指令遵从度；若原有的 qwen3-vl-flash 是业务强制要求可改回
        messages:[
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.3, // 降低温度值，减少AI自由发散，确保内容更加严谨
        top_p: 0.8
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'API 请求失败');
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
          res.status(500).json({ error: '大模型API返回格式错误' });
          return;
        }

        const botResponse = data.choices[0].message?.content || '抱歉，我暂时无法回答您的问题，请直接联系 Lavender (17816872286)。';
        res.status(200).json({ response: botResponse });
        
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          res.status(504).json({ error: '请求超时，请稍后重试' });
        } else {
          res.status(500).json({ error: `大模型连接失败: ${fetchError.message}` });
        }
      }

    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}