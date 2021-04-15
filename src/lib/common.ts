import _ from 'lodash';
import { Extra } from 'telegraf';
import { ICryptanceContext, IMarketActionRequest, IMarketActionResponse, IMarketOrder } from './interfaces';

export function toArgs(ctx: ICryptanceContext): string[] {
  const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;
  const parts = regex.exec(ctx.message!.text!.trim());
  if (!parts) {
    return [];
  }
  return !parts[3] ? [] : parts[3].split(/\s+/).filter(arg => arg.length);
}

export const MARKDOWN = Extra.markdown(true);

export const NO_PREVIEW = MARKDOWN.webPreview(false);

export const hiddenCharacter = '\u200b';

export function handleMarketAction(request: IMarketActionRequest): IMarketActionResponse {
  const executedOrders: IMarketOrder[] = [];
  let obtainedTargetAssetAmount = 0;
  let executedSourceAssetAmount = 0;
  let remainingSourceAssetAmount = request.amount;
  if (request.action === 'buy') {
    const askOrders = request.orderBook.asks;
    for (const order of askOrders) {
      if (remainingSourceAssetAmount <= 0) {
        break;
      }
      const orderQuantity = parseFloat(order.quantity);
      const orderPrice = parseFloat(order.price);
      const iterUnlimitedQuantity = remainingSourceAssetAmount / orderPrice;
      const iterQuantity = _.min([orderQuantity, iterUnlimitedQuantity]);
      if (!iterQuantity) {
        continue;
      }
      executedOrders.push({ quantity: iterQuantity, price: orderPrice });
      obtainedTargetAssetAmount += iterQuantity;
      remainingSourceAssetAmount -= iterQuantity * orderPrice;
      executedSourceAssetAmount += iterQuantity * orderPrice;
    }
  } else {
    const bidOrders = request.orderBook.bids;
    for (const order of bidOrders) {
      if (remainingSourceAssetAmount <= 0) {
        break;
      }
      const orderQuantity = parseFloat(order.quantity);
      const orderPrice = parseFloat(order.price);
      const iterQuantity = _.min([orderQuantity, remainingSourceAssetAmount]);
      if (!iterQuantity) {
        continue;
      }
      executedOrders.push({ quantity: iterQuantity, price: orderPrice });
      obtainedTargetAssetAmount += iterQuantity * orderPrice;
      remainingSourceAssetAmount -= iterQuantity;
      executedSourceAssetAmount += iterQuantity;
    }
  }

  return {
    executedOrders,
    executedSourceAssetAmount,
    obtainedTargetAssetAmount,
    remainingSourceAssetAmount,
  };
}
