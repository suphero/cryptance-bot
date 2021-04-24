import { OrderBook } from 'binance-api-node';
import { TelegrafContext } from 'telegraf/typings/context';

export class IPair {
  public leftSymbol: string;
  public rightSymbol: string;
  public apiPair: string;

  constructor(pair: string) {
    const symbols = pair.split('/');
    if (symbols.length !== 2) {
      throw new Error('Invalid pair, use like BTC/USDT');
    }
    this.leftSymbol = symbols[0];
    this.rightSymbol = symbols[1];
    this.apiPair = `${symbols[0]}${symbols[1]}`;
  }
}

export type ActionType = 'buy' | 'sell';

export interface IMarketActionRequest {
  pair: IPair;
  action: ActionType;
  amount: number;
  orderBook: OrderBook;
}

export interface IMarketActionResponse {
  executedSourceAssetAmount: number;
  remainingSourceAssetAmount: number;
  obtainedTargetAssetAmount: number;
  executedOrders: IMarketOrder[];
}

export interface IPairAction {
  pair: IPair;
  action: ActionType;
}

export interface IPairActionLoop {
  loop: IPairAction[];
}

export interface IMarketOrder {
  price: number;
  quantity: number;
}

// tslint:disable-next-line: no-empty-interface
export interface ICryptanceContext extends TelegrafContext {}
