const https = require('https');
const originalRequest = https.request;

https.request = function (options, ...args) {
    const req = originalRequest.call(this, options, ...args);
    req.on('response', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                if (rawData.includes('projectArchiveUrl')) {
                    const match = rawData.match(/"projectArchiveUrl":"([^"]+)"/);
                    if (match) {
                        console.log('\n\n[FOUND_ARCHIVE_URL]: ' + match[1]);
                    }
                }
            } catch (e) { }
        });
    });
    return req;
};

// Start the EAS CLI process
require('/usr/lib/node_modules/eas-cli/bin/run');
