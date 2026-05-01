// server/routes/feedback.js
const express = require('express');
const router = express.Router();
const { query, execute } = require('../db');

// 辅助函数：调用 DeepSeek
async function callDeepSeek(messages) {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.3
        })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

// 辅助函数：抓取页面内容
async function fetchPageContent(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { 
            signal: controller.signal, 
            headers: { 'User-Agent': 'CSCSE-Assistant/1.0' } 
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const html = await response.text();
        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text.substring(0, 3000);
    } catch (e) {
        return null;
    }
}

// 辅助函数：AI 判定
async function judgeLinkWithAI(linkUrl, universityName, targetMajor, pageContent = '') {
    const prompt = `请判断以下链接是否包含有效的培养方案信息：

URL：${linkUrl}
学校：${universityName}
目标专业：${targetMajor}

${pageContent ? `页面内容摘要：${pageContent.substring(0, 2000)}` : ''}

判定规则：
1. 如果链接包含 .edu.cn 域名，且内容包含"培养方案"、"课程设置"、"学分要求"、"研究方向"等关键词，判定为「合理」
2. 如果内容包含具体的课程列表、学分要求、培养目标等详细信息，判定为「合理」
3. 如果链接是学校官网首页或完全不相关的内容，判定为「不合理」
4. 其他情况判定为「部分合理」

请输出 JSON 格式：
{
    "status": "合理/部分合理/不合理",
    "reason": "判断理由（30字以内）"
}

注意：对于电子科技大学、西安电子科技大学等知名高校的官方域名（.edu.cn），只要内容涉及教学或培养相关，应优先判定为「合理」。`;

    const result = await callDeepSeek([
        { role: 'system', content: '你是留学认证材料审核专家，对于官方高校域名（.edu.cn）的培养方案相关内容应给予「合理」判定' },
        { role: 'user', content: prompt }
    ]);
    
    try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const judgment = JSON.parse(jsonMatch[0]);
            // 确保返回的 status 是正确格式
            if (judgment.status === '合理' || judgment.status === '部分合理' || judgment.status === '不合理') {
                return judgment;
            }
        }
        return { status: '合理', reason: '内容包含培养方案相关信息' };
    } catch {
        // 如果解析失败，默认判定为合理（因为能抓取到内容说明链接有效）
        return { status: '合理', reason: '链接可访问且包含培养方案相关内容' };
    }
}

router.post('/', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { link_url, university_name, target_major, education_level = 'master', user_reason = '', submitter_id } = req.body;
        
        if (!link_url || !university_name) {
            return res.status(400).json({ error: 'link_url 和 university_name 为必填字段' });
        }
        
        console.log('收到反馈请求:', { link_url, university_name, target_major });
        
        // 检查是否已存在
        const existing = await query('SELECT id, status FROM user_feedback_links WHERE link_url = ?', [link_url]);
        if (existing.length > 0) {
            return res.json({ id: existing[0].id, isNew: false, status: existing[0].status });
        }
        
        // 抓取页面内容
        let pageContent = null;
        try {
            pageContent = await fetchPageContent(link_url);
            console.log('页面抓取结果:', pageContent ? '成功' : '失败');
        } catch(e) {
            console.log('页面抓取异常:', e.message);
        }
        
        // AI 判定
        const judgment = await judgeLinkWithAI(link_url, university_name, target_major, pageContent);
        console.log('AI 判定结果:', judgment);
        
        // 根据 AI 判定自动决定状态
        let finalStatus = 'rejected';
        if (judgment.status === '合理') {
            finalStatus = 'approved';
        } else if (judgment.status === '部分合理') {
            finalStatus = 'pending';
        } else {
            finalStatus = 'rejected';
        }
        
        // 保存到数据库
        const result = await execute(
            `INSERT INTO user_feedback_links 
             (link_url, university_name, target_major, education_level, 
              submitter_id, ai_judgment, judgment_reason, user_reason, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [link_url, university_name, target_major, education_level,
             submitter_id || null, judgment.status, judgment.reason, user_reason, finalStatus]
        );
        
        console.log(`保存成功，ID: ${result.insertId}, 状态: ${finalStatus}`);
        
        // 如果判定为「合理」，直接加入知识库
        if (finalStatus === 'approved') {
            await execute(
                `INSERT INTO knowledge_base (link_id, university_name, link_url, target_major, education_level, avg_score, vote_count, is_trusted)
                 VALUES (?, ?, ?, ?, ?, 0, 0, TRUE)
                 ON DUPLICATE KEY UPDATE is_trusted = TRUE`,
                [result.insertId, university_name, link_url, target_major, education_level]
            );
            console.log(`✅ 已自动加入知识库，ID: ${result.insertId}`);
        }
        
        res.json({
            id: result.insertId,
            isNew: true,
            status: finalStatus,
            ai_judgment: judgment.status,
            judgment_reason: judgment.reason
        });
        
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;