import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ForecastEventConsumer } from '../../lib/forecast/forecast-event-consumer';

describe('ForecastEventConsumer - Unit Tests', () => {
  test('should handle domain events without throwing error', async () => {
    const consumer = new ForecastEventConsumer();

    await assert.doesNotReject(async () => {
      await consumer.handleSalesCreated({ storeId: 'store-1', orderId: 'ord-100' });
      await consumer.handleInventoryUpdated({ storeId: 'store-1', productId: 'p-1' });
      await consumer.handlePurchaseCompleted({ storeId: 'store-1', poId: 'po-1' });
      await consumer.handleSupplierUpdated({ storeId: 'store-1', supplierId: 'sup-1' });
      await consumer.handlePromotionChanged({ storeId: 'store-1', promoId: 'promo-1' });
      await consumer.handleWeatherUpdated({ storeId: 'store-1', city: 'Pune' });
    });
  });
});
