import assert from 'assert';
import { hasPermission, canViewFinancials, maskFinancials } from '../lib/rbac';
import { cashService } from '../lib/store-assistant/cash-service';
import { taskService } from '../lib/store-assistant/task-service';
import { loyaltyService } from '../lib/store-assistant/loyalty-service';

export function runStoreAutomationTests() {
  console.log('Running Store Automation Test Suite...');

  // 1. RBAC Tests
  assert.strictEqual(hasPermission('owner', 'view_financials'), true, 'Owner should view financials');
  assert.strictEqual(hasPermission('owner', 'manage_purchases'), true, 'Owner should manage purchases');
  assert.strictEqual(canViewFinancials('owner'), true, 'Owner can view financials');

  assert.strictEqual(canViewFinancials('cashier'), false, 'Cashier cannot view financials');
  assert.strictEqual(hasPermission('cashier', 'view_financials'), false, 'Cashier denied view_financials');
  assert.strictEqual(hasPermission('cashier', 'execute_pos'), true, 'Cashier allowed execute_pos');

  assert.strictEqual(canViewFinancials('warehouse'), false, 'Warehouse cannot view financials');
  assert.strictEqual(hasPermission('warehouse', 'manage_inventory'), true, 'Warehouse allowed manage_inventory');

  const rawData = {
    product_name: 'Rice 5kg',
    price: 250,
    cost_price: 180,
    profit_margin: 28,
    stock: 50,
  };

  const maskedForCashier = maskFinancials(rawData, 'cashier');
  assert.strictEqual(maskedForCashier.cost_price, undefined, 'cost_price masked for cashier');
  assert.strictEqual(maskedForCashier.profit_margin, undefined, 'profit_margin masked for cashier');
  assert.strictEqual(maskedForCashier.price, 250, 'public price visible for cashier');

  const unmaskedForOwner = maskFinancials(rawData, 'owner');
  assert.strictEqual(unmaskedForOwner.cost_price, 180, 'cost_price retained for owner');
  assert.strictEqual(unmaskedForOwner.profit_margin, 28, 'profit_margin retained for owner');

  // 2. Cash Reconciliation Tests
  const counts = {
    d500: 4,  // 2000
    d200: 5,  // 1000
    d100: 10, // 1000
    d50: 4,   // 200
    d20: 5,   // 100
    d10: 10,  // 100
    coins: 45 // 45
  };
  const total = cashService.calculateDenominationTotal(counts);
  assert.strictEqual(total, 4445, 'Denomination total should be 4445');

  // 3. Task Metadata Tests
  const meta = taskService.getTaskTypeMeta('expiry_check');
  assert.ok(meta, 'Task type meta found');
  assert.strictEqual(meta.type, 'expiry_check', 'Meta type matches expiry_check');

  // 4. Loyalty Segment Actions
  const vipActions = loyaltyService.getSegmentActions('vip');
  assert.ok(vipActions.length > 0, 'VIP actions defined');
  assert.strictEqual(vipActions[0].type, 'reward', 'VIP action type is reward');

  const lostActions = loyaltyService.getSegmentActions('lost');
  assert.ok(lostActions.length > 0, 'Lost actions defined');
  assert.strictEqual(lostActions[0].type, 'reactivation', 'Lost action type is reactivation');

  console.log('✅ ALL STORE AUTOMATION TESTS PASSED SUCCESSFULLY.');
}

if (require.main === module) {
  runStoreAutomationTests();
}
