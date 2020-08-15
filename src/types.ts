import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { AuthHandlerOptions } from './handlers/auth';
import { RestMiddlewareHandlers, RestHandlerOptions } from './handlers/rest';
import { GuardHandlerOptions } from './handlers/guard';

export interface PossiblyAuthedNextApiRequest extends NextApiRequest {
	uid?: string | number | null;
	user?: any | null;
	totp?: any;
	_mws?: string[];
}

export type PossiblyAuthedNextApiHandler = (
	req: PossiblyAuthedNextApiRequest,
	res: NextApiResponse
) => Promise<void> | NextApiHandler;

export enum HttpMethod {
	GET = 'get',
	PUT = 'put',
	POST = 'post',
	PATCH = 'patch',
	DELETE = 'delete',
}

export interface RestError {
	code: number;
	message: string;
	spread?: { [key: string]: any };
}

/**
 * @internal
 */
export interface GenericObject {
	[key: string]: any;
}

export type CatchHandler = (
	req: PossiblyAuthedNextApiRequest,
	res: NextApiResponse,
	error: any
) => Promise<void> | void;

/**
 * @internal
 */
export interface GenericOptions extends GenericObject {
	catch?: CatchHandler;
}

export interface MiddlewareOptions extends GenericOptions {
	auth?: AuthHandlerOptions;
	guard?: GuardHandlerOptions;
	rest?: RestHandlerOptions;
}

export type MiddlewareHandler = <T extends GenericOptions>(
	handler: PossiblyAuthedNextApiHandler,
	opts: T
) => PossiblyAuthedNextApiHandler;

export type MiddlewareRestHandler = (
	handlers: RestMiddlewareHandlers,
	opts?: MiddlewareOptions
) => PossiblyAuthedNextApiHandler;

export { NextApiResponse };
