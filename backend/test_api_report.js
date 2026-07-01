async function testApiSaveReport() {
	console.log('Testing API /api/save-report...');

	const reportData = {
		username: 'api_test_user',
		topic: 'API Test Topic',
		totalScore: 85,
		dateTime: new Date().toLocaleString('ru-RU'),
		details: [
			{ question: 'API Q1', isCorrect: true, timeSpent: 15 }
		]
	};

	try {
		const response = await fetch('http://localhost:3031/api/save-report', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(reportData)
		});

		const result = await response.json();
		console.log('API Response status:', response.status);
		console.log('API Response body:', result);

		if (result.success) {
			console.log('Successfully saved report via API.');

			// Verify via API
			const getResponse = await fetch('http://localhost:3031/api/reports/api_test_user');
			const getResult = await getResponse.json();
			console.log('Retrieved reports via API:', JSON.stringify(getResult, null, 2));
		} else {
			console.log('Failed to save report via API.');
		}
	} catch (error) {
		console.error('Error during API test:', error);
	}
}

testApiSaveReport();
