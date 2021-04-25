import Binance, { CandleChartInterval } from 'binance-api-node';
import _ from 'lodash';
import * as talib from 'talib-binding';
import { CandlestickMapper } from '../lib/CandlestickMapper';
import { toArgs } from '../lib/common';
import { ICryptanceContext, IPair } from '../lib/interfaces';
import { OptionalArgs } from '../lib/OptionalArgs';

const buyText = '🟢 buy';
const sellText = '🔴 sell';
const buyToNeutralText = '🟢🟡 neutral';
const sellToNeutralText = '🔴🟡 neutral';
const binance = Binance();

const indicatorCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 2 && args.length !== 3) {
    return ctx.reply(`Usage: /indicator BTC/USDT 4h [d,t,n]`);
  }

  const pair = new IPair(args[0]);
  const interval = args[1] as CandleChartInterval;
  const optionalArgs =  args.length === 3 ? new OptionalArgs(args[2]) : undefined;
  const limit = 1000;

  if (!interval) {
    return ctx.reply(`Invalid interval: ${args[1]}`);
  }
  const candles = await binance.candles({ symbol: pair.apiPair, interval, limit });
  const mapper = new CandlestickMapper(candles);

  const emptyMessage = '';
  const symbolMessage = `Symbol: ${pair.leftSymbol}/${pair.rightSymbol}`;
  const intervalMessage = `Interval: ${interval}`;
  const rsiMessage = getRsiMessage(mapper.closes, optionalArgs);
  const macdMessage = getMacdMessage(mapper.closes, optionalArgs);
  const emaMessage = getEmaMessage(mapper.closes, optionalArgs);
  const bbandsMessage = getBbandsMessage(mapper.closes, optionalArgs);
  const stochRsiMessage = getStochRsiMessage(mapper.closes, optionalArgs);
  const atrMessage = getAtrMessage(mapper.highs, mapper.lows, mapper.closes);
  // TODO: On Balance Volume, Accumulation/Distribution Line

  const messages = [
    symbolMessage,
    intervalMessage,
    emptyMessage,
    rsiMessage,
    macdMessage,
    emaMessage,
    bbandsMessage,
    stochRsiMessage,
  ];

  if (optionalArgs?.isTarget) {
    messages.push(emptyMessage);
    messages.push(atrMessage);
  }
  const message = messages.join('\n');

  return ctx.reply(message);
};

function getRsiMessage(closes: number[], optionalArgs?: OptionalArgs) {
  const result = talib.RSI(closes);
  const last = _.last(result) ?? 50;
  let signalText: string;
  let lastChange: number;
  if (last > 70) {
    signalText = sellText;
    lastChange = _.findLastIndex(result, s => s < 70);
  } else if (last < 30) {
    signalText = buyText;
    lastChange = _.findLastIndex(result, s => s > 30);
  } else {
    const lastBuyChange = _.findLastIndex(result, s => s <= 30);
    const lastSellChange = _.findLastIndex(result, s => s >= 70);
    if (lastBuyChange > lastSellChange) {
      signalText = buyToNeutralText;
      lastChange = lastBuyChange;
    } else {
      signalText = sellToNeutralText;
      lastChange = lastSellChange;
    }
  }
  const signalLength = result.length;
  const signalOld = signalLength - lastChange;
  const messages = [`RSI: ${signalText} [${signalOld}]`];
  if (optionalArgs?.isDetail) {
    messages.push(`- RSI14: ${last}`);
  }
  if (optionalArgs?.isNote) {
    messages.push('- Note: <30 -> Buy, >70 -> Sell');
  }

  const message = messages.join('\n');
  return message;
}

function getMacdMessage(closes: number[], optionalArgs?: OptionalArgs) {
  const [, , signal] = talib.MACD(closes);
  const min = _.min(signal);
  const max = _.max(signal);
  const last = _.last(signal) ?? 0;
  const signalText = last > 0 ? buyText : sellText;
  const signalLength = signal.length;
  let lastChange: number;
  if (last > 0) {
    lastChange = _.findLastIndex(signal, s => s < 0);
  } else {
    lastChange = _.findLastIndex(signal, s => s > 0);
  }
  const signalOld = signalLength - lastChange;

  const messages = [`MACD: ${signalText} [${signalOld}]`];
  if (optionalArgs?.isDetail) {
    messages.push(`- Last: ${last}`);
    messages.push(`- Min: ${min}`);
    messages.push(`- Max: ${max}`);
  }
  if (optionalArgs?.isNote) {
    messages.push('- Note: Positive -> Buy, Negative -> Sell');
  }

  const message = messages.join('\n');
  return message;
}

function getEmaMessage(closes: number[], optionalArgs?: OptionalArgs) {
  const result50 = talib.EMA(closes, 50);
  const result200 = talib.EMA(closes, 200);
  const last50 = _.last(result50) ?? 0;
  const last200 = _.last(result200) ?? 0;
  const isBuy = last50 > last200;
  const signalText = isBuy ? buyText : sellText;

  const reverse50 = _.reverse(result50);
  const reverse200 = _.reverse(result200);
  let signalOld: number = -1;

  for (let i = 0; i < reverse200.length; i++) {
    const iter200 = reverse200[i];
    const iter50 = reverse50[i];
    const iterBuy = iter50 > iter200;
    if (isBuy && !iterBuy) {
      signalOld = i;
      break;
    }
    if (!isBuy && iterBuy) {
      signalOld = i;
      break;
    }
  }

  const messages = [`EMA 50/200: ${signalText} [${signalOld}]`];
  if (optionalArgs?.isDetail) {
    messages.push(`- EMA50: ${last50}`);
    messages.push(`- EMA200: ${last200}`);
  }
  if (optionalArgs?.isNote) {
    messages.push('- Note: EMA50 > EMA200 -> Buy, EMA50 < EMA200 -> Sell');
  }

  const message = messages.join('\n');
  return message;
}

function getBbandsMessage(closes: number[], optionalArgs?: OptionalArgs) {
  const [resultUp, , resultDown] = talib.BBANDS(closes, 21);
  const lastResultUp = _.last(resultUp) ?? 0;
  const lastResultDown = _.last(resultDown) ?? 0;
  const lastClose = _.last(closes) ?? 0;
  let signalText: string = '';
  const isSell = lastClose > lastResultUp;
  const isBuy = lastClose < lastResultDown;
  const isNeutral = !isSell && !isBuy;

  const reverseClose = _.reverse(closes);
  const reverseUp = _.reverse(resultUp);
  const reverseDown = _.reverse(resultDown);
  let signalOld: number = -1;

  for (let i = 0; i < reverseUp.length; i++) {
    const iterClose = reverseClose[i];
    const iterUp = reverseUp[i];
    const iterDown = reverseDown[i];
    const iterSell = iterClose > iterUp;
    const iterBuy = iterClose < iterDown;
    const iterNeutral = !iterSell && !iterBuy;
    if (isBuy && !iterBuy) {
      signalText = buyText;
      signalOld = i;
      break;
    }
    if (isSell && !iterSell) {
      signalText = sellText;
      signalOld = i;
      break;
    }
    if (isNeutral && !iterNeutral) {
      if (iterBuy) {
        signalText = buyToNeutralText;
        signalOld = i;
        break;
      }
      if (iterSell) {
        signalText = sellToNeutralText;
        signalOld = i;
        break;
      }
    }
  }

  const messages = [`BBands: ${signalText} [${signalOld}]`];
  if (optionalArgs?.isDetail) {
    messages.push(`- Current: ${lastClose}`);
    messages.push(`- Up: ${lastResultUp}`);
    messages.push(`- Down: ${lastResultDown}`);
  }
  if (optionalArgs?.isNote) {
    messages.push('- Note: Current < Down -> Buy, Current > Up -> Sell');
  }

  const message = messages.join('\n');
  return message;
}

function getStochRsiMessage(closes: number[], optionalArgs?: OptionalArgs) {
  const [result] = talib.STOCHRSI(closes);
  const last = _.last(result) ?? 50;
  let signalText: string;
  let lastChange: number;
  if (last > 80) {
    signalText = sellText;
    lastChange = _.findLastIndex(result, s => s < 80);
  } else if (last < 20) {
    signalText = buyText;
    lastChange = _.findLastIndex(result, s => s > 20);
  } else {
    const lastBuyChange = _.findLastIndex(result, s => s <= 20);
    const lastSellChange = _.findLastIndex(result, s => s >= 80);
    if (lastBuyChange > lastSellChange) {
      signalText = buyToNeutralText;
      lastChange = lastBuyChange;
    } else {
      signalText = sellToNeutralText;
      lastChange = lastSellChange;
    }
  }
  const signalLength = result.length;
  const signalOld = signalLength - lastChange;

  const messages = [`STOCH RSI: ${signalText} [${signalOld}]`];
  if (optionalArgs?.isDetail) {
    messages.push(`- STOCH RSI: ${last}`);
  }
  if (optionalArgs?.isNote) {
    messages.push('- Note: <20 -> Buy, >80 -> Sell');
  }

  const message = messages.join('\n');
  return message;
}

function getAtrMessage(highs: number[], lows: number[], closes: number[]) {
  const result = talib.ATR(highs, lows, closes);
  const last = _.last(result) ?? 0;
  const lastClose = _.last(closes) ?? 0;
  const tp1 = lastClose + last;
  const tp2 = lastClose + 2 * last;
  const tp3 = lastClose + 3 * last;
  const sl1 = lastClose - last;
  const sl2 = lastClose - 2 * last;
  const sl3 = lastClose - 3 * last;

  const messages = [
    `ATR: ${last}`,
    `- TP3: ${tp3}`,
    `- TP2: ${tp2}`,
    `- TP1: ${tp1}`,
    `- Current: ${lastClose}`,
    `- SL1: ${sl1}`,
    `- SL2: ${sl2}`,
    `- SL3: ${sl3}`,
  ];

  const message = messages.join('\n');
  return message;
}

export { indicatorCommand };
