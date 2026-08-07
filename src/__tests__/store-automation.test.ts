import assert from 'assert';
import { hasPermission, canViewFinancials, maskFinancials } from '../lib/rbac';
import { cashService } from '../lib/store-assistant/cash-service';
import { taskService } from '../lib/store-assistant/task-service';
import { loyaltyService } from '../lib/store-assistant/loyalty-service';
import { validateStoreAssistantAuth } from '../lib/store-assistant/api-auth';
import { whatsAppProvider, emailProvider, pdfProvider } from '../lib/store-assistant/providers';
import { logger } from '../lib/store-assistant/structured-logger';

export async function runStoreAutomationTests() {
  console.log('Running Store Automation Test Suite...');

  // 1. RBAC Tests
  assert.strictEqual(hasPermission('owner', 'view_financials'), true, 'Owner should view financials');
  assert.strictEqual(hasPermission('owner', 'manage_purchases'), true, 'Owner should manage purchases');
  assert.strictEqual(hasPermission('owner', 'manage_store_config'), true, 'Owner should manage store config');
  assert.strictEqual(hasPermission('store_manager', 'manage_store_config'), true, 'Store Manager should manage store config');
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

  // 2. API Authorization & RBAC Validation Tests
  const mockCashierReq = {
    headers: {
      get: (headerName: string) => {
        if (headerName === 'x-user-id') return 'store_123';
        if (headerName === 'x-user-role') return 'cashier';
        return null;
      },
    },
  } as any;

  const authResult = await validateStoreAssistantAuth(mockCashierReq, 'purchase.generate', 'store_123');
  assert.strictEqual(authResult.authorized, false, 'Cashier rejected for purchase.generate');
  assert.strictEqual(authResult.status, 403, 'Forbidden status returned for unauthorized role');

  const mockOwnerReq = {
    headers: {
      get: (headerName: string) => {
        if (headerName === 'x-user-id') return 'store_123';
        if (headerName === 'x-user-role') return 'owner';
        return null;
      },
    },
  } as any;

  const ownerAuthResult = await validateStoreAssistantAuth(mockOwnerReq, 'purchase.generate', 'store_123');
  assert.strictEqual(ownerAuthResult.authorized, true, 'Owner authorized for purchase.generate');

  // 3. Provider Abstraction Tests
  const waResult = await whatsAppProvider.sendTextMessage('919876543210', 'Test notification');
  assert.strictEqual(waResult.success, true, 'WhatsApp provider send successful');

  const emailResult = await emailProvider.sendEmail('vendor@supplier.com', 'Test Subject', 'Body text');
  assert.strictEqual(emailResult.success, true, 'Email provider send successful');

  const pdfResult = await pdfProvider.generatePOPDF({ po_number: 'PO-TEST-1', total_amount: 1500 });
  assert.ok(pdfResult.pdfText.includes('PO-TEST-1'), 'PDF provider generates document content');

  // 4. Structured Logger Tests
  const logObj = logger.info('test_action', { key: 'value' }, 'store_123', 'user_456');
  assert.strictEqual(logObj.action, 'test_action', 'Logger records action name');
  assert.strictEqual(logObj.status, 'success', 'Logger records status');

  // 5. Cash Reconciliation Denomination Tests
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

  // 6. Task Metadata Tests
  const meta = taskService.getTaskTypeMeta('expiry_check');
  assert.ok(meta, 'Task type meta found');
  assert.strictEqual(meta.type, 'expiry_check', 'Meta type matches expiry_check');

  // 7. Loyalty Segment Actions
  const vipActions = loyaltyService.getSegmentActions('vip');
  assert.ok(vipActions.length > 0, 'VIP actions defined');
  assert.strictEqual(vipActions[0].type, 'reward', 'VIP action type is reward');

  const lostActions = loyaltyService.getSegmentActions('lost');
  assert.ok(lostActions.length > 0, 'Lost actions defined');
  assert.strictEqual(lostActions[0].type, 'reactivation', 'Lost action type is reactivation');

  console.log('✅ ALL STORE AUTOMATION & HARDENING TESTS PASSED SUCCESSFULLY.');
}

if (require.main === module) {
  runStoreAutomationTests();
}

