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
app.use(express.json());

// =================== Proxy Helper ===================
const createServiceProxy = (path, target, rewrite = '', timeout = 30000) => {
  return createProxyMiddleware(path, {
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: rewrite },
    timeout,
    proxyTimeout: timeout,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying ${req.method} ${req.originalUrl} -> ${target}${rewrite}`);
      
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy Error for ${path}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: `Service unavailable: ${path.replace('/api/', '')}`,
          service: target
        });
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Proxy Response: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
    }
  });
};

// =================== Microservice Proxies ===================

// Auth Service
app.use('/api/auth', createServiceProxy(
  '/api/auth', 
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001', 
  ''
));

// Data Service - Posts
app.use('/api/posts', createServiceProxy(
  '/api/posts',
  process.env.DATA_SERVICE_URL || 'http://localhost:3005',
  ''
));

// Data Service - Cart
app.use('/api/cart', createServiceProxy(
  '/api/cart',
  process.env.DATA_SERVICE_URL || 'http://localhost:3005',
  ''
));

// Data Service - Favorites
app.use('/api/favorites', createServiceProxy(
  '/api/favorites',
  process.env.DATA_SERVICE_URL || 'http://localhost:3005',
  ''
));

// Data Service - Notifications
app.use('/api/notifications', createServiceProxy(
  '/api/notifications',
  process.env.DATA_SERVICE_URL || 'http://localhost:3005',
  ''
));

// User Service
app.use('/api/users', createServiceProxy(
  '/api/users',
  process.env.USER_SERVICE_URL || 'http://localhost:3003',
  ''
));

// =================== Health Check ===================
app.get('/health', async (req, res) => {
  const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    data: process.env.DATA_SERVICE_URL || 'http://localhost:3005',
    users: process.env.USER_SERVICE_URL || 'http://localhost:3003'
  };

  const results = {};
  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      results[name] = {
        status: 'up',
        response: response.data
      };
    } catch (err) {
      results[name] = {
        status: 'down',
        error: err.message
      };
    }
  }

  res.status(200).json({ 
    status: 'API Gateway is running', 
    timestamp: new Date().toISOString(),
    services: results 
  });
});

// =================== 404 Handler ===================
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found in API Gateway', 
    path: req.originalUrl,
    method: req.method,
    available_routes: [
      '/api/auth/*',
      '/api/posts/*',
      '/api/cart/*',
      '/api/favorites/*',
      '/api/notifications/*',
      '/api/users/*',
      '/health'
    ]
  });
});

// =================== Error Handling ===================
app.use((error, req, res, next) => {
  console.error('API Gateway Error:', error);
  res.status(500).json({ 
    error: 'Internal server error in API Gateway',
    message: error.message 
  });
});

// =================== Start Server ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}`);
  console.log(`🔗 Data Service: ${process.env.DATA_SERVICE_URL || 'http://localhost:3005'}`);
  console.log(`🔗 User Service: ${process.env.USER_SERVICE_URL || 'http://localhost:3003'}`);
  console.log('\n📋 Available Routes:');
  console.log('   GET    /health');
  console.log('   POST   /api/auth/signup');
  console.log('   POST   /api/auth/signin');
  console.log('   GET    /api/posts');
  console.log('   POST   /api/posts');
  console.log('   GET    /api/cart');
  console.log('   POST   /api/cart');
  console.log('   GET    /api/favorites');
  console.log('   POST   /api/favorites');
  console.log('   GET    /api/notifications');
});