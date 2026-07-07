import http from 'http';

async function testAuth() {
    console.log('--- Testing Auth Endpoints ---');
    const testUser = 'testuser_' + Date.now();
    const testPass = 'testpass123';
    const testDesc = 'This is a test description';

    const makeRequest = async (body) => {
        return new Promise((resolve, reject) => {
            const req = http.request('http://localhost:3032/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data });
                    }
                });
            });
            req.on('error', reject);
            req.write(JSON.stringify(body));
            req.end();
        });
    };

    try {
        console.log('\n1. Registering without description...');
        let res = await makeRequest({ nickname: testUser, password: testPass });
        console.log('Response:', res.data);

        console.log('\n2. Registering with description...');
        res = await makeRequest({ nickname: testUser, password: testPass, description: testDesc });
        console.log('Response:', res.data);

        console.log('\n3. Logging in with correct password...');
        res = await makeRequest({ nickname: testUser, password: testPass });
        console.log('Response:', res.data);

        console.log('\n--- Auth Tests Completed ---');
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testAuth();
