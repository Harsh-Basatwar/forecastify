const https = require('https');

const data = JSON.stringify({
  from: 'en',
  to: 'hi',
  json: {
    "nav.overview": "Overview",
    "nav.purchaseList": "Purchase List"
  }
});

const options = {
  hostname: 'google-translate113.p.rapidapi.com',
  port: 443,
  path: '/api/v1/translator/json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-rapidapi-host': 'google-translate113.p.rapidapi.com',
    'x-rapidapi-key': 'dbd1341a70msh7fb2b5c52656361p1ee998jsnc82f12670eed',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log(responseData);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
