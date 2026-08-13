import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEvaluationResponse } from './evaluationParser.js';

test('parses a plain JSON evaluation', () => {
	assert.deepEqual(
		parseEvaluationResponse('{"score":10,"feedback":"Ответ верный."}'),
		{ score: 10, feedback: 'Ответ верный.' },
	);
});

test('parses an evaluation wrapped in a Markdown code block', () => {
	assert.deepEqual(
		parseEvaluationResponse('```json\n{"score":7,"feedback":"Ответ частично полный."}\n```'),
		{ score: 7, feedback: 'Ответ частично полный.' },
	);
});

test('rejects an evaluation with an invalid contract', () => {
	assert.throws(
		() => parseEvaluationResponse('{"score":12,"feedback":"Некорректная оценка."}'),
		/does not contain valid score and feedback/,
	);
});

test('rejects a response without JSON', () => {
	assert.throws(
		() => parseEvaluationResponse('Не удалось оценить ответ.'),
		/does not contain valid score and feedback/,
	);
});
