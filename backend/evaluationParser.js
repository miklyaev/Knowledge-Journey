export function parseEvaluationResponse(content) {
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error('AI evaluation response is empty');
	}

	const trimmedContent = content.trim();
	const objectStart = trimmedContent.indexOf('{');
	const objectEnd = trimmedContent.lastIndexOf('}');
	const candidates = [trimmedContent];

	if (objectStart !== -1 && objectEnd > objectStart) {
		candidates.push(trimmedContent.slice(objectStart, objectEnd + 1));
	}

	for (const candidate of candidates) {
		try {
			const result = JSON.parse(candidate);

			if (
				typeof result === 'object' &&
				result !== null &&
				typeof result.score === 'number' &&
				Number.isFinite(result.score) &&
				result.score >= 0 &&
				result.score <= 10 &&
				typeof result.feedback === 'string' &&
				result.feedback.trim()
			) {
				return {
					score: result.score,
					feedback: result.feedback,
				};
			}
		} catch {
			// Try the next candidate without Markdown or surrounding text.
		}
	}

	throw new Error('AI evaluation response does not contain valid score and feedback');
}
