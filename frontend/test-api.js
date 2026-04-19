const http = require('http');

const data = JSON.stringify({
  email: 'admin@timelesspages.com',
  password: 'admin123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log("Token:", json.token);

    // Now create checkout session
    const orderData = JSON.stringify({ items: [{ title: 'Test Book', price: 500, qty: 1 }], shippingDetails: { fullName: 'Test', city: 'Delhi' } });
    const orderReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payment/create-checkout-session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': orderData.length,
        'Authorization': 'Bearer ' + json.token
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => console.log("Order Res:", body2));
    });
    orderReq.write(orderData);
    orderReq.end();
  });
});

req.write(data);
req.end();
