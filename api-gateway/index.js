const express = require('express')
const {createProxyMiddleware} = require('http-proxy-middleware')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')


const app = express()

app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

app.use('./auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite:{
        '^/auth': '',
    },
}));

app.use('./data', createProxyMiddleware({
    target: process.env.DATA_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite:{
        '^/data' : '',
    },
}));

app.use('./users', createProxyMiddleware({
    target: process.env.USER_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite:{
        '^/users' : '',
    },
}));

app.get('./health', (req, res) => {
    res.status(200).json({status: 'API Gateway is running'})
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    
})