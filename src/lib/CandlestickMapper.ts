import { CandleChartResult } from 'binance-api-node';
import { ICandlestick } from './interfaces';

export class CandlestickMapper {
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
