import fetch from 'node-fetch';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const SYSTEM_PROMPT = `你是Lavender的专属数字分身，负责在她的个人主页上专业、得体、有条理地回答访客提问。

【Lavender的真实背景资料】
- 核心定位：7年ToB业务专家，资深产品经理/项目经理/售前解决方案负责人（女，1996年出生）。
- 擅长领域：能源管理、智慧政务信息化、AIoT场景化应用、SaaS轻量级产品设计、CRM全流程交付。
- 重点项目成果：
  1. 综合能源管理系统：主导SaaS化产品从0到1落地，完成AIOT+计量收费一体化方案。
  2. 医疗CRM优化：主导售前到落地全流程，搭建数据看板，有效提升客户续费率。
  3. 智慧监管云中心：带领团队完成千万级（1500W+）上海市/国家级政务项目，覆盖需求设计到交付验收。
- 核心能力：擅长从0到1产品构建、复杂业务逻辑拆解、高价值交付。目前正积极探索AI赋能工作。
- 联系方式：电话/微信 17816872286，邮箱 17816872286@163.com

【你的回复绝对规则】
1. 必须分段与换行：禁止把所有话挤在一段！当列举经验、成果时，必须使用换行符，以列表形式（如 1. 2. 3. 或 •）呈现，保证视觉清晰。
2. 语气自然得体：你是一个聪明的AI助手，语气要自信，专业、像真人交谈。开头可以说"Lavender在...方面经验丰富："，而不是生硬地直接抛出标签。
3. 严格基于事实：绝不发散，绝不编造上述资料外的内容。如果访客问了资料中没有的细节（如具体薪资、未提及的公司），请礼貌回答："关于这部分的详细信息，建议您直接与Lavender本人沟通。"
4. 精简有重点：回答控制在100-150字左右，挑最相关的核心成就回答，结尾可以自然地附上一句引导联系的话。`;

export const onRequestPost = async ({ request }) => {
  console.log('Received POST request to /api/chat');
  
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    console.log('API Key configured:', !!apiKey);
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '未配置 DASHSCOPE_API_KEY 环境变量' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    let body = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Parse body error:', e);
    }

    const message = body.message || '';
    if (!message) {
      return new Response(JSON.stringify({ error: '请提供消息内容' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    console.log('User message:', message);

    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const payload = {
      model: 'qwen3-vl-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      temperature: 0.4
    };

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(payload)
      }
    );

    console.log('DashScope response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DashScope error:', errorText);
      return new Response(JSON.stringify({ error: `大模型API调用失败: ${response.status} - ${errorText}` }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('DashScope response data:', JSON.stringify(data));

    if (!data.choices || data.choices.length === 0) {
      return new Response(JSON.stringify({ error: '大模型API返回格式错误' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const botResponse = data.choices[0].message?.content || '抱歉，我暂时无法回答你的问题';
    console.log('Bot response:', botResponse);

    return new Response(JSON.stringify({ response: botResponse }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: `服务器内部错误: ${error.message}` }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestOptions = () => {
  console.log('Received OPTIONS request to /api/chat');
  return new Response('', {
    status: 204,
    headers: CORS_HEADERS
  });
};
