import { auth, rest, guard, error } from './handlers';
import { NextApiResponse } from 'next';
import { RestMiddlewareHandlers, RestHandlerOptions } from './handlers/rest';
import { AuthHandlerOptions } from './handlers/auth';
import { GuardHandlerOptions } from './handlers/guard';
import { ErrorHandlerOptions } from './handlers/error';
import { handleDefaultError } from './utils';
import {
	PossiblyAuthedNextApiHandler,
	PossiblyAuthedNextApiRequest,
	MiddlewareHandler,
	MiddlewareOptions,
	GenericOptions,
} from './types';

export function chain(
	middleware: MiddlewareHandler[],
	handler: PossiblyAuthedNextApiHandler,
	opts: MiddlewareOptions = {}
): PossiblyAuthedNextApiHandler {
	return async (req: PossiblyAuthedNextApiRequest, res: NextApiResponse) => {
		if (middleware.length === 0) {
			await handler(req, res);
			return;
		}

		const recursiveStepThrough = async (
			req: PossiblyAuthedNextApiRequest,
			res: NextApiResponse,
			idx: number = 0
		): Promise<void> => {
			const mw = middleware[idx];
			if (!mw) {
				await handler(req, res);
				return;
			}

			const next: PossiblyAuthedNextApiHandler = async (req, res) => {
				await recursiveStepThrough(req, res, idx + 1);
			};

			if (!req._mws) req._mws = [];
			req._mws.push(mw.name);
			await mw(next, opts[mw.name])(req, res);
		};

		try {
			await recursiveStepThrough(req, res);
		} catch (error) {
			if (typeof opts?.catch === 'function') {
				opts?.catch(req, res, error);
			} else {
				handleDefaultError(res, error);
			}
		}
	};
}

function withDefaultOptions(options?: MiddlewareOptions): MiddlewareOptions {
	return {
		catch: (_req: PossiblyAuthedNextApiRequest, res: NextApiResponse, error: any) => {
			console.error(error);
			res.status(500).json({ error: 'Internal Server Error' });
		},
		auth: {
			strategy: 'none',
		},
		...options,
	};
}

function middlewareHandlerFactory<T extends GenericOptions>(mw: MiddlewareHandler, options: T) {
	if (typeof mw !== 'function') {
		throw new Error('Middleware handler must be a function');
	}

	return (handler: PossiblyAuthedNextApiHandler, opts?: T) => {
		const mergedOpts = { ...options, ...opts };

		const safeHandler = async (req: PossiblyAuthedNextApiRequest, res: NextApiResponse) => {
			try {
				await handler(req, res);
			} catch (error) {
				if (!mergedOpts.catch) {
					return handleDefaultError(res, error);
				}

				mergedOpts.catch(req, res, error);
			}
		};

		return mw<T>(safeHandler, mergedOpts);
	};
}

type Partial<T> = {
	[P in keyof T]?: T[P];
};

function createExport(_options?: MiddlewareOptions) {
	const options = withDefaultOptions(_options);

	return {
		rest: (handlers: RestMiddlewareHandlers, opts?: MiddlewareOptions) => rest(handlers, { ...options, ...opts }),
		auth: middlewareHandlerFactory<Partial<AuthHandlerOptions>>(auth, options.auth ?? { strategy: 'none' }),
		error: middlewareHandlerFactory<Partial<ErrorHandlerOptions>>(error, { catch: options?.catch }),
		guard: middlewareHandlerFactory<Partial<GuardHandlerOptions>>(guard, options.guard ?? {}),
		_: {
			chain: (
				middleware: MiddlewareHandler[],
				handler: PossiblyAuthedNextApiHandler,
				opts?: MiddlewareOptions
			): PossiblyAuthedNextApiHandler => chain(middleware, handler, { ...options, ...opts }),
			createExport: (opts: MiddlewareOptions) => createExport({ ...options, ...opts }),
		},
	};
}

export { createExport, auth, rest, guard };

export default createExport();
