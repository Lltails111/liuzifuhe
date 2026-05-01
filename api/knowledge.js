// api/knowledge.js - 简化版
let knowledgeStore = [];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        const { target_major, limit = 5 } = req.query;
        
        let filtered = knowledgeStore;
        if (target_major) {
            filtered = filtered.filter(k => 
                k.target_major?.toLowerCase().includes(target_major.toLowerCase())
            );
        }
        
        return res.status(200).json({
            links: filtered.slice(0, parseInt(limit)),
            count: filtered.length
        });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}