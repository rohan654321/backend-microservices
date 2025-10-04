const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const app = express();

// =================== Middleware ===================
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json()); // MUST be before proxy

// =================== Proxy Helper ===================
const createServiceProxy = (path, target, rewrite = '', timeout = 20000) => {
  return createProxyMiddleware(path, {
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: rewrite },
    timeout,
    proxyTimeout: timeout,
    selfHandleResponse: false, // let proxy handle response
    onProxyReq: (proxyReq, req, res) => {
      // Forward JSON body for POST/PUT/PATCH
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error(`${path} Service Error:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: `${path.replace('/api/', '')} service unavailable` });
      }
    }
  });
};

// =================== Microservice Proxies ===================
app.use('/api/auth', createServiceProxy('/api/auth', process.env.AUTH_SERVICE_URL || 'http://localhost:3001', ''));
app.use('/api/posts', createServiceProxy('/api/posts', process.env.DATA_SERVICE_URL || 'http://localhost:3002', ''));
app.use('/api/users', createServiceProxy('/api/users', process.env.USER_SERVICE_URL || 'http://localhost:3003', ''));

// =================== Health Check ===================
app.get('/health', async (req, res) => {
  const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    data: process.env.DATA_SERVICE_URL || 'http://localhost:3002',
    users: process.env.USER_SERVICE_URL || 'http://localhost:3003'
  };

  const results = {};
  for (const [name, url] of Object.entries(services)) {
    try {
      await axios.get(`${url}/health`, { timeout: 3000 });
      results[name] = 'up';
    } catch (err) {
      results[name] = 'down';
    }
  }

  res.status(200).json({ status: 'API Gateway is running', services: results });
});

// =================== 404 Handler ===================
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// =================== Error Handling ===================
app.use((error, req, res, next) => {
  console.error('API Gateway Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// =================== Start Server ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}`);
  console.log(`🔗 Data Service: ${process.env.DATA_SERVICE_URL || 'http://localhost:3002'}`);
  console.log(`🔗 User Service: ${process.env.USER_SERVICE_URL || 'http://localhost:3003'}`);
});
