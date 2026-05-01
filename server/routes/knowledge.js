// server/routes/knowledge.js
const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { target_major, education_level, limit = 10 } = req.query;
        
        console.log('知识库查询参数:', { target_major, education_level, limit });
        
        // 简化 SQL，逐步构建
        let sql = `
            SELECT 
                f.id,
                f.university_name,
                f.link_url,
                f.target_major,
                f.education_level,
                f.ai_judgment,
                f.judgment_reason,
                f.status,
                f.created_at
            FROM user_feedback_links f
            WHERE f.status = 'approved'
        `;
        
        // 添加条件
        if (target_major && target_major.trim()) {
            sql += ` AND f.target_major LIKE '%${target_major}%'`;
        }
        
        if (education_level && education_level.trim()) {
            sql += ` AND f.education_level = '${education_level}'`;
        }
        
        sql += ` ORDER BY f.created_at DESC LIMIT ${parseInt(limit) || 10}`;
        
        console.log('执行 SQL:', sql);
        
        const links = await query(sql, []);
        
        console.log(`查询到 ${links.length} 条记录`);
        
        res.json({ links, count: links.length });
        
    } catch (error) {
        console.error('知识库查询错误:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;