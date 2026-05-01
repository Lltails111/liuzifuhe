// ==================== js/utils/api.js ====================

// 自动判断环境：本地开发用 localhost，生产环境用当前域名
const API_BASE = (() => {
    // 如果是本地开发
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // 生产环境（Vercel）
    return window.location.origin;
})();

async function post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
}

async function get(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
}

async function callDeepSeek(messages, options = {}) {
    const { temperature = 0.3, model = 'deepseek-chat' } = options;
    
    const result = await post('/api/proxy', {
        model,
        messages,
        temperature,
        stream: false
    });
    
    return result.choices?.[0]?.message?.content || '';
}

window.API = { post, get, callDeepSeek };