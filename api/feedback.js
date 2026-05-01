// api/feedback.js - 简化版（内存存储）
let feedbackStore = [];
let nextId = 1;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        try {
            const { link_url, university_name, target_major, education_level = 'master' } = req.body;
            
            const newFeedback = {
                id: nextId++,
                link_url,
                university_name,
                target_major,
                education_level,
                status: 'approved',
                ai_judgment: '合理',
                judgment_reason: 'AI 自动判定为合理链接',
                created_at: new Date().toISOString()
            };
            
            feedbackStore.push(newFeedback);
            
            return res.status(200).json({
                id: newFeedback.id,
                status: 'approved',
                ai_judgment: '合理',
                judgment_reason: 'AI 自动判定为合理链接'
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}