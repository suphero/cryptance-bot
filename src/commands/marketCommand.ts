import Binance from 'binance-api-node';
import _ from 'lodash';
import { handleMarketAction, toArgs } from '../lib/common';
import { ActionType, ICryptanceContext, IMarketActionRequest, IPair } from '../lib/interfaces';

const binance = Binance();

const marketCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 3) {
    return ctx.reply(`Usage: /cross BTCUSDT buy 123456`);
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

  const firstPrice = _.first(response.executedOrders)?.price;
  const lastPrice = _.last(response.executedOrders)?.price;
  const totalOrderAssetPrice = _.sumBy(response.executedOrders, o => o.price * o.quantity);
  const totalOrderQuantity = _.sumBy(response.executedOrders, o => o.quantity);
  const averagePrice = totalOrderAssetPrice / totalOrderQuantity;
  const message = `Obtained: ${response.obtainedTargetAssetAmount}\nRemaining: ${response.remainingSourceAssetAmount}\nPrice: ${averagePrice} (${firstPrice} -> ${lastPrice})`;
  return ctx.reply(message);
};

export { marketCommand };
