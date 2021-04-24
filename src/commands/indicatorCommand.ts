import Binance, { CandleChartInterval, CandleChartResult } from 'binance-api-node';
import _ from 'lodash';
import * as talib from 'talib-binding';
import { toArgs } from '../lib/common';
import { ICryptanceContext, IPair } from '../lib/interfaces';

const buyText = '🟢 buy';
const sellText = '🔴 sell';
const neutralText = '🟡 neutral';
const binance = Binance();

const indicatorCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 2) {
    return ctx.reply(`Usage: /indicator BTC/USDT 4h`);
  }

  const pair = new IPair(args[0]);
  const interval = args[1] as CandleChartInterval;
  const limit = 1000;

  if (!interval) {
    return ctx.reply(`Invalid interval: ${args[1]}`);
  }
  const candles = await binance.candles({ symbol: pair.apiPair, interval, limit });
  const mapper = new CandlestickMapper(candles);

  const emptyMessage = '';
  const symbolMessage = `Symbol: ${pair.leftSymbol}/${pair.rightSymbol}`;
  const intervalMessage = `Interval: ${interval}`;
  const rsiMessage = getRsiMessage(mapper.closes);
  const macdMessage = getMacdMessage(mapper.closes);
  const emaMessage = getEmaMessage(mapper.closes);
  const bbandsMessage = getBbandsMessage(mapper.closes);
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
    emptyMessage,
    atrMessage,
  ];
  const message = messages.join('\n');

  return ctx.reply(message);
};

function getRsiMessage(closes: number[]) {
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
    signalText = neutralText;
    lastChange = _.findLastIndex(result, s => s < 30 || s > 70);
  }
  const signalLength = result.length;
  const signalOld = signalLength - lastChange;
  const messages = [
    `RSI: ${signalText}`,
    `- Signal Change: ${signalOld} candles old`,
    `- RSI14: ${last}`,
    '- Note: <30 -> Buy, >70 -> Sell',
  ];

  const message = messages.join('\n');
  return message;
}

function getMacdMessage(closes: number[]) {
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

  const messages = [
    `MACD: ${signalText}`,
    `- Signal Change: ${signalOld} candles old`,
    `- Last: ${last}`,
    `- Min: ${min}`,
    `- Max: ${max}`,
    '- Note: Positive -> Buy, Negative -> Sell',
  ];

  const message = messages.join('\n');
  return message;
}

function getEmaMessage(closes: number[]) {
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

  const messages = [
    `EMA 50/200: ${signalText}`,
    `- Signal Change: ${signalOld} candles old`,
    `- EMA50: ${last50}`,
    `- EMA200: ${last200}`,
    '- Note: EMA50 > EMA200 -> Buy, EMA50 < EMA200 -> Sell',
  ];

  const message = messages.join('\n');
  return message;
}

function getBbandsMessage(closes: number[]) {
  const [resultUp, , resultDown] = talib.BBANDS(closes);
  const lastResultUp = _.last(resultUp) ?? 0;
  const lastResultDown = _.last(resultDown) ?? 0;
  const lastClose = _.last(closes) ?? 0;
  let signalText: string;
  if (lastClose > lastResultUp) {
    signalText = sellText;
  } else if (lastClose < lastResultDown) {
    signalText = buyText;
  } else {
    signalText = neutralText;
  }
  const messages = [
    `BBands: ${signalText}`,
    `- Current: ${lastClose}`,
    `- Up: ${lastResultUp}`,
    `- Down: ${lastResultDown}`,
    '- Note: Current < Down -> Buy, Current > Up -> Sell',
  ];

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

class CandlestickMapper {
  public opens: number[] = [];
  public highs: number[] = [];
  public lows: number[] = [];
  public closes: number[] = [];
  public volumes: number[] = [];
  public candlesticks: ICandlestick[] = [];
  constructor(ticks: CandleChartResult[]) {
    this.map(ticks);
  }

  private map(ticks: CandleChartResult[]) {
    this.opens = [];
    this.highs = [];
    this.lows = [];
    this.closes = [];
    this.volumes = [];
    this.candlesticks = [];
    for (const tick of ticks) {
      const open = parseFloat(tick.open);
      const high = parseFloat(tick.high);
      const low = parseFloat(tick.low);
      const close = parseFloat(tick.close);
      const volume = parseFloat(tick.volume);
      const candlestick: ICandlestick = {
        baseAssetVolume: parseFloat(tick.baseAssetVolume),
        close,
        closeTime: tick.closeTime,
        high,
        low,
        open,
        openTime: tick.openTime,
        quoteAssetVolume: parseFloat(tick.quoteAssetVolume),
        trades: tick.trades,
        volume,
      };
      this.opens.push(open);
      this.highs.push(high);
      this.lows.push(low);
      this.closes.push(close);
      this.volumes.push(volume);
      this.candlesticks.push(candlestick);
    }
  }
}

interface ICandlestick {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  trades: number;
  baseAssetVolume: number;
}

export { indicatorCommand };
