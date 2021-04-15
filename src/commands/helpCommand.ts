import { ICryptanceContext } from '../lib/interfaces';

const helpCommand = () => (ctx: ICryptanceContext) => {
  return ctx.reply('Get Help');
};

export { helpCommand };
