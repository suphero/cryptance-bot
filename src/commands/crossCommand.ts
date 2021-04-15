import Binance from 'binance-api-node';
import { handleMarketAction, toArgs } from '../lib/common';
import { ActionType, ICryptanceContext, IMarketActionRequest, IPair } from '../lib/interfaces';

const binance = Binance();

const crossCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 7) {
    return ctx.reply(`Usage: /cross 1000 BTC/USDT buy ETH/BTC buy ETH/USDT sell`);
  }
  const amount = parseFloat(args[0]);
  const pair1 = new IPair(args[1]);
  const action1 = args[2] as ActionType;
  const pair2 = new IPair(args[3]);
  const action2 = args[4] as ActionType;
  const pair3 = new IPair(args[5]);
  const action3 = args[6] as ActionType;

  const orderBook1Promise = binance.book({ symbol: pair1.apiPair, limit: 5000 });
  const orderBook2Promise = binance.book({ symbol: pair2.apiPair, limit: 5000 });
  const orderBook3Promise = binance.book({ symbol: pair3.apiPair, limit: 5000 });
  const orderBookResults = await Promise.all([orderBook1Promise, orderBook2Promise, orderBook3Promise]);

  const request1: IMarketActionRequest = { pair: pair1, action: action1, amount, orderBook: orderBookResults[0] };
  const response1 = handleMarketAction(request1);
  const request2: IMarketActionRequest = {
    action: action2,
    amount: response1.obtainedTargetAssetAmount,
    orderBook: orderBookResults[1],
    pair: pair2,
  };
  const response2 = handleMarketAction(request2);
  const request3: IMarketActionRequest = {
    action: action3,
    amount: response2.obtainedTargetAssetAmount,
    orderBook: orderBookResults[2],
    pair: pair3,
  };
  const response3 = handleMarketAction(request3);
  const obtainedTargetAssetAmount = response3.obtainedTargetAssetAmount;
  const rate = obtainedTargetAssetAmount / amount;

  const message = `Obtained: ${obtainedTargetAssetAmount}\nRate: ${rate}`;
  return ctx.reply(message);
};

export { crossCommand };
