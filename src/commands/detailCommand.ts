import Binance, { CandleChartInterval, CandleChartResult } from 'binance-api-node';
import _ from 'lodash';
import * as talib from 'talib-binding';
import { toArgs } from '../lib/common';
import { ICryptanceContext } from '../lib/interfaces';

const binance = Binance();

const detailCommand = () => async (ctx: ICryptanceContext) => {
  const args = toArgs(ctx);
  if (args.length !== 2) {
    return ctx.reply(`Usage: /detail BTCUSDT 4h`);
  }

  const symbol = args[0];
  const interval = args[1] as CandleChartInterval;

  if (!interval) {
    return ctx.reply(`Invalid interval: ${args[1]}`);
  }
  const candles = await binance.candles({ symbol, interval });
  // binance.candlesticks(symbol, interval, (_error: any, ticks: any) => {
  const mapper = new CandlestickMapper(candles);

  // const result = talib.ADX(mapper.highs, mapper.lows, mapper.closes);
  const rsiResult = talib.RSI(mapper.closes);
  const [, , macdSignal] = talib.MACD(mapper.closes);
  const macdMinSignal = _.min(macdSignal);
  const macdMaxSignal = _.max(macdSignal);
  const macdLastSignal = _.last(macdSignal);
  const obvResult = talib.OBV(mapper.closes, mapper.volumes);
  const obvMin = _.min(obvResult);
  const obvMax = _.max(obvResult);
  const obvLast = _.last(obvResult);
  const message = `Symbol: ${symbol}\nInterval: ${interval}\nRSI: ${
    rsiResult[rsiResult.length - 1]
  }\nMACD: ${macdLastSignal} [${macdMinSignal} | ${macdMaxSignal}]\nOBV: ${obvLast} [${obvMin} | ${obvMax}]`;
  return ctx.reply(message);
  // });
};

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

export { detailCommand };
