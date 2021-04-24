import Debug from 'debug';
import Telegraf from 'telegraf';
// tslint:disable-next-line: no-var-requires
const rateLimit = require('telegraf-ratelimit');
import { BotCommand } from 'telegraf/typings/telegram-types';
import { helpCommand, indicatorCommand, marketCommand, startCommand } from '../commands';
import config from '../config';
import { commandEnum } from './enums';
import { ICryptanceContext } from './interfaces';
import { ok } from './responses';
const debug = Debug('lib:telegram');

const bot = new Telegraf<ICryptanceContext>(config.TELEGRAM_BOT_TOKEN);

function botUtils() {
  const limitConfig = {
    limit: 3,
    onLimitExceeded: (ctx: ICryptanceContext) => ctx.reply('Please slow down'),
    window: 3000,
  };

  bot.use(Telegraf.log());
  bot.use(catcherMiddleware);
  bot.use(rateLimit(limitConfig));

  bot
    .command(commandEnum.start, startCommand())
    .command(commandEnum.help, helpCommand())
    .command(commandEnum.indicator, indicatorCommand())
    .command(commandEnum.market, marketCommand());
}

const catcherMiddleware = async (ctx: ICryptanceContext, next: any): Promise<void> => {
  try {
    await next();
  } catch (e) {
    await ctx.reply(e.message, e?.extra);
  }
};

async function localBot() {
  debug('Bot is running in development mode at http://localhost:3000');

  bot.webhookReply = false;

  const botInfo = await bot.telegram.getMe();
  bot.options.username = botInfo.username;
  debug('Server has initialized bot username: ', botInfo.username);

  debug(`deleting webhook`);
  await bot.telegram.deleteWebhook();

  debug(`starting polling`);
  bot.start();
}

export async function status() {
  await syncWebhook();
  await syncCommands();

  return ok('Listening to bot events...');
}

async function syncWebhook() {
  if (!config.ENDPOINT_URL) {
    throw new Error('ENDPOINT_URL is not set.');
  }
  if (!config.WEBHOOK_PATH) {
    throw new Error('WEBHOOK_PATH is not set.');
  }

  const getWebhookInfo = await bot.telegram.getWebhookInfo();
  const expectedWebhookUrl = `${config.ENDPOINT_URL}/${config.WEBHOOK_PATH}`;

  if (getWebhookInfo.url !== expectedWebhookUrl) {
    debug(`deleting webhook`);
    await bot.telegram.deleteWebhook();
    debug(`setting webhook to ${expectedWebhookUrl}`);
    await bot.telegram.setWebhook(expectedWebhookUrl);
  }
}

async function syncCommands() {
  const myCommands = await bot.telegram.getMyCommands();
  const commandsSetProperly = checkCommands(myCommands);
  if (!commandsSetProperly) {
    debug(`setting new commands`);
    await bot.telegram.setMyCommands(commands);
  }
}

const commands: BotCommand[] = [
  { command: commandEnum.indicator, description: 'Get Indicators' },
  { command: commandEnum.market, description: 'Market Action Results' },
  { command: commandEnum.help, description: 'Get Help' },
];

function checkCommands(existingCommands: BotCommand[]) {
  const commandsLength = commands.length;
  if (existingCommands.length !== commandsLength) {
    return false;
  }
  for (let i = 0; i < commandsLength; i++) {
    const command = commands[i];
    const existingCommand = existingCommands[i];
    if (command.command !== existingCommand.command) {
      return false;
    }
    if (command.description !== existingCommand.description) {
      return false;
    }
  }
  return true;
}

export async function webhook(event: any) {
  debug(JSON.stringify(event));
  bot.webhookReply = true;
  // call bot commands and middlware
  botUtils();

  const body = JSON.parse(event.body);
  await bot.handleUpdate(body);
  return ok('Success');
}

if (config.IS_DEV) {
  debug('isDev', config.IS_DEV);
  startDevelopment();
}

async function startDevelopment() {
  await syncCommands();
  await localBot();
  botUtils();
  await bot.launch();
}
