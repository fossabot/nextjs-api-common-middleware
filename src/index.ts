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
) {
	return async (req: PossiblyAuthedNextApiRequest, res: NextApiResponse) => {
		const getNext = (currentName: string): MiddlewareHandler | undefined => {
			const currentIndex = middleware.findIndex((func) => func.name === currentName);
			return middleware[currentIndex + 1];
		};

		const constructHandler = (mw: MiddlewareHandler, next?: MiddlewareHandler): PossiblyAuthedNextApiHandler => {
			if (!next) return mw(handler, opts[mw.name]);
			return mw(constructHandler(next, getNext(next.name)), opts[mw.name]);
		};

		try {
			await constructHandler(middleware[0], middleware[1])(req, res);
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
		totp: () => {
			throw new Error('Must populate request with totp information to use the auth and totp feature');
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
		// totp: middlewareHandlerFactory(rest, options),
		error: middlewareHandlerFactory<Partial<ErrorHandlerOptions>>(error, { catch: options?.catch || undefined }),
		guard: middlewareHandlerFactory<Partial<GuardHandlerOptions>>(guard, options.guard ?? {}),
		_: {
			chain,
			createExport: (opts: MiddlewareOptions) => createExport({ ...options, ...opts }),
		},
	};
}

export { createExport, auth, rest, guard };

export default createExport();
