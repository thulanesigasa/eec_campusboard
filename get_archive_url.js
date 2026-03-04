const https = require('https');
const originalRequest = https.request;

https.request = function(options, ...args) {
  const req = originalRequest.call(this, options, ...args);
  req.on('response', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        if (rawData.includes('projectArchiveUrl')) {
          const parsed = JSON.parse(rawData);
          // Look for projectArchiveUrl deeply in the response
          const match = rawData.match(/"projectArchiveUrl":"([^"]+)"/);
          if (match) {
            console.log('\n\nFOUND_ARCHIVE_URL:', match[1]);
          }
        }
      } catch (e) {}
    });
  });
  return req;
};

// Require the EAS CLI entry point
require('/usr/lib/node_modules/eas-cli/build/bin.js');
