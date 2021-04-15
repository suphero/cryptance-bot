import test from 'ava';
import sinon from 'sinon';
import Telegraf, { Context as TelegrafContext } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import { startCommand } from '../src/commands';
import { ICryptanceContext } from '../src/lib/interfaces';

const BaseTextMessage: Message = {
  chat: { id: 1, type: 'private' },
  date: Date.now(),
  message_id: 1,
  text: 'foo',
};

function createBot() {
  const bot = new Telegraf<ICryptanceContext>('');
  return bot;
}

let sandbox: sinon.SinonSandbox;
let replyStub: sinon.SinonStub;
test.beforeEach(() => {
  sandbox = sinon.createSandbox();
  replyStub = sandbox.stub(TelegrafContext.prototype, 'reply');
  replyStub.resolves();
});

test.afterEach(() => {
  sandbox.restore();
});

test('handle start', async t => {
  const bot = createBot();
  bot.on('message', startCommand());

  await bot.handleUpdate({ message: BaseTextMessage, update_id: 1 });
  t.true(true);
});
