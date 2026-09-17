const http = require('http');

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- Testing 1: GET /api/estimates ---');
  const getRes = await request({
    hostname: 'localhost',
    port: 3002,
    path: '/api/estimates',
    method: 'GET',
  });
  console.log('GET Status:', getRes.status, 'Count:', getRes.data?.data?.length);

  console.log('\n--- Testing 2: POST /api/estimates (Create Draft) ---');
  const postRes = await request(
    {
      hostname: 'localhost',
      port: 3002,
      path: '/api/estimates',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Presupuesto de Prueba Dist',
      clientName: 'Cliente Test',
      projectName: 'Proyecto Test',
    }
  );
  console.log('POST Status:', postRes.status, 'ID:', postRes.data?.id);
  const estId = postRes.data?.id;

  if (!estId) {
    console.error('Failed to create estimate!');
    process.exit(1);
  }

  console.log('\n--- Testing 3: POST /api/estimates/' + estId + '/calculate?force=1 (Generar Paramétrico) ---');
  const calcRes = await request(
    {
      hostname: 'localhost',
      port: 3002,
      path: `/api/estimates/${estId}/calculate?force=1`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  console.log('CALCULATE Status:', calcRes.status);
  console.log('Grand Total:', calcRes.data?.grandTotal);
  console.log('Line Items Count:', calcRes.data?.lineItems?.length);

  if (calcRes.status === 200) {
    console.log('\nSUCCESS! Generar Paramétrico calculated successfully without 500 error!');
  } else {
    console.error('\nFAILED with status:', calcRes.status, calcRes.data);
  }
}

runTest().catch(console.error);
