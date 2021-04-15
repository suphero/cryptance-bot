import { ICryptanceContext } from '../lib/interfaces';

const startCommand = () => (ctx: ICryptanceContext) => {
  return ctx.reply('Welcome to Cryptance Bot.');
};

export { startCommand };
