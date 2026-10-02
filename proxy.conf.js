const backendHost = process.env.BACKEND_HOST || 'localhost';
const backendPort = process.env.BACKEND_PORT || '3060';
const target = `http://${backendHost}:${backendPort}`;

module.exports = {
  '/api': {
    target,
    pathRewrite: { '^/api': '' },
    changeOrigin: true,
  },
  '/uploads': {
    target,
    changeOrigin: true,
  },
};
