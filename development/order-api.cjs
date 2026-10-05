const { createApp } = require('../server.cjs');

function createOrderApiPlugin(appOptions = {}) {
    const configure = server => {
        server.middlewares.use('/api', createApp(appOptions));
        // Unknown API requests must not fall through to Vite's SPA HTML fallback.
        server.middlewares.use('/api', (req, res) => {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'APIが見つかりません。' }));
        });
    };
    return { name: 'ordering-api', configureServer: configure, configurePreviewServer: configure };
}

module.exports = { createOrderApiPlugin };
