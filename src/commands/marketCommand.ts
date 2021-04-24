import Binance from 'binance-api-node';
import _ from 'lodash';
import { handleMarketAction, toArgs } from '../lib/common';
import { ActionType, ICryptanceContext, IMarketActionRequest, IMarketOrder, IPair } from '../lib/interfaces';

const binance = Binance();

const marketCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 3) {
    return ctx.reply(`Usage: /market BTC/USDT buy 123456`);
  }
  const pair = new IPair(args[0]);
  const action = args[1] as ActionType;
  const amount = parseFloat(args[2]);

  if (!_.includes(['buy', 'sell'], action)) {
    return ctx.reply(`Valid actions: buy & sell`);
  }

  const orderBook = await binance.book({ symbol: pair.apiPair, limit: 5000 });
  const request: IMarketActionRequest = { pair, action, amount, orderBook };
  const response = handleMarketAction(request);

  const obtainedMessage = `Obtained: ${response.obtainedTargetAssetAmount}`;
  const remainingMessage = `Remaining: ${response.remainingSourceAssetAmount}`;
  const priceMessage = getPriceMessage(response.executedOrders);
  const messages = [obtainedMessage, remainingMessage, priceMessage];
  const message = messages.join('\n');

  return ctx.reply(message);
};

function getPriceMessage(executedOrders: IMarketOrder[]) {
  const firstPrice = _.first(executedOrders)?.price;
  const lastPrice = _.last(executedOrders)?.price;
  const totalOrderAssetPrice = _.sumBy(executedOrders, o => o.price * o.quantity);
  const totalOrderQuantity = _.sumBy(executedOrders, o => o.quantity);
  const averagePrice = totalOrderAssetPrice / totalOrderQuantity;

  const priceMessage = `Price: ${averagePrice} (${firstPrice} -> ${lastPrice})`;
  return priceMessage;
}

export { marketCommand };
