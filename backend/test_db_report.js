import dbService from './dbservice.js';

async function testSaveReport() {
	console.log('Testing saveReport...');

	// Wait a bit for the initial connection check to complete
	await new Promise(resolve => setTimeout(resolve, 1000));

	console.log('dbEnabled:', dbService.dbEnabled);

	if (!dbService.dbEnabled) {
		console.log('Database is not enabled. Cannot test saveReport.');
		process.exit(1);
	}

	const testReport = {
		username: 'test_user_123',
		topic: 'Test Topic',
		totalScore: 100,
		details: [
			{ question: 'Q1', isCorrect: true, timeSpent: 10 }
		]
	};

	try {
		const result = await dbService.saveReport(testReport);
		console.log('saveReport result:', result);

		if (result) {
			console.log('Successfully saved report to database.');

			// Verify it was saved
			const reports = await dbService.getReportsByUsername('test_user_123');
			console.log('Retrieved reports:', JSON.stringify(reports, null, 2));
		} else {
			console.log('Failed to save report to database.');
		}
	} catch (error) {
		console.error('Error during test:', error);
	} finally {
		await dbService.disconnect();
		process.exit(0);
	}
}

testSaveReport();
