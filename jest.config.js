module.exports = {
	coverageProvider: 'v8',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
};
