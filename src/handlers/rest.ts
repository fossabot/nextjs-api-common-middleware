import { NextApiResponse } from 'next';
import { PossiblyAuthedNextApiHandler, PossiblyAuthedNextApiRequest, GenericOptions, HttpMethod } from '../types';
import { _runHandler, handleDefaultError } from '../utils';

export type RestMiddlewareHandlers = {
	[key in HttpMethod]?: PossiblyAuthedNextApiHandler;
};

export interface RestHandlerOptions extends GenericOptions {
	/**
	 * Error message that is displayed when user tries to access a non-standardized HTTP method
	 * Defaults to `Request method is not defined`.
	 */
	undefinedMethod?: string;
	/**
	 * Error message that is displayed when user tries to access a non-available HTTP method
	 * Defaults to `Not Implemented`.
	 */
	notImplemented?: string;
}

export default function rest(
	handlers: RestMiddlewareHandlers,
	opts?: RestHandlerOptions
): PossiblyAuthedNextApiHandler {
	return async (req: PossiblyAuthedNextApiRequest, res: NextApiResponse) => {
		try {
			if (!req.method) {
				throw new Error(opts?.undefinedMethod ?? 'Request method is not defined');
			}

			const method = req.method.toLowerCase() as HttpMethod;
			const handler = handlers[method];
			if (handler && typeof handler === 'function') {
				await _runHandler(handler, req, res);
			} else {
				throw new Error(opts?.notImplemented ?? 'Not Implemented');
			}
		} catch (error) {
			if (typeof opts?.catch === 'function') {
				opts?.catch(req, res, error);
			} else {
				handleDefaultError(res, error);
			}
		}
	};
}