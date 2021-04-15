import { Context, Handler } from 'aws-lambda';
import { status, webhook } from './lib';
import { ok } from './lib/responses';

export const statusHandler: Handler = async () => {
  try {
    return await status();
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.error(e);
    return ok();
  }
};

export const webhookHandler: Handler = async (event: any, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    return await webhook(event);
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.error(e);
    return ok();
  }
};
