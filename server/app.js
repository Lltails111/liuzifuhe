// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（指向项目根目录）
app.use(express.static(path.join(__dirname, '..')));

// 导入路由
const proxyRoute = require('./routes/proxy');
const feedbackRoute = require('./routes/feedback');
const rateRoute = require('./routes/rate');
const knowledgeRoute = require('./routes/knowledge');
const judgeLinkRoute = require('./routes/judge-link');
const trackRoute = require('./routes/track');
const adminRoute = require('./routes/admin');

// 注册路由
app.use('/api/proxy', proxyRoute);
app.use('/api/feedback', feedbackRoute);
app.use('/api/rate', rateRoute);
app.use('/api/knowledge', knowledgeRoute);
app.use('/api/judge-link', judgeLinkRoute);
app.use('/api/track', trackRoute);
app.use('/api/admin', adminRoute);  

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器已启动`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`📁 静态文件: ${path.join(__dirname, '..')}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
});