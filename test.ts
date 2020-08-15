import { createExport } from './src';

createExport({
	catch: (_req, res, err) => {
		console.error(err);
		res.status(500).send('An unknown error occurred');
	},
	auth: {
		strategy: 'custom',
		custom: (authHeaderValue, _req) => {
			if (authHeaderValue && authHeaderValue === 'test') {
				return {
					uid: 123,
					user: {
						firstname: 'Test',
						lastname: 'User',
					},
				};
			}
			return null;
		},
	},
});
