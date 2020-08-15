import { IncomingHttpHeaders } from 'http';
import { NextApiResponse } from 'next';
import { PossiblyAuthedNextApiHandler, PossiblyAuthedNextApiRequest, GenericObject } from './types';

export function handleDefaultError(res: NextApiResponse, error: any) {
	if (error) console.error(error);
	res.status(500).send('An unexpected error occurred, please try again.');
}

export function _getHeaderValue(name: string, headers: IncomingHttpHeaders) {
	const idx = Object.keys(headers).findIndex((key) => key.toLowerCase() === name.toLowerCase());
	if (idx === -1) return null;
	return Object.values(headers)[idx];
}

export async function _runHandler(
	handler: PossiblyAuthedNextApiHandler,
	req: PossiblyAuthedNextApiRequest,
	res: NextApiResponse
) {
	const maybePromise = handler(req, res);
	if (maybePromise instanceof Promise) {
		await maybePromise;
	}
}
