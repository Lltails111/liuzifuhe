// api/proxy.js
export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取 API Key（从环境变量）
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  if (!DEEPSEEK_API_KEY) {
    console.error('API Key 未配置');
    return res.status(500).json({ error: 'API Key 未配置，请在 Vercel 环境变量中添加 DEEPSEEK_API_KEY' });
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    // 返回结果
    return res.status(200).json(data);
  } catch (error) {
    console.error('代理错误:', error);
    return res.status(500).json({ error: error.message });
  }
}