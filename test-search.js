const https = require('https');
const query = encodeURIComponent('"The Operation ID must be a Long, but was instead"');
https.get(`https://api.duckduckgo.com/?q=${query}&format=json`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
