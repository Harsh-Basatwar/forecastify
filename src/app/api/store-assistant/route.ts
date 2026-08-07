/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Store Assistant — Consolidated API Route
 *
 * Handles all store-assistant sub-module operations via a single endpoint
 * with action-based routing: POST /api/store-assistant { action, storeId, ...params }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service imports
import { dailyBriefService } from '@/lib/store-assistant/daily-brief-service';
import { khataService } from '@/lib/store-assistant/khata-service';
import { taskService } from '@/lib/store-assistant/task-service';
import { shelfService } from '@/lib/store-assistant/shelf-service';
import { expiryService } from '@/lib/store-assistant/expiry-service';
import { deadInventoryService } from '@/lib/store-assistant/dead-inventory-service';
import { cashService } from '@/lib/store-assistant/cash-service';
import { loyaltyService } from '@/lib/store-assistant/loyalty-service';
import { festivalService } from '@/lib/store-assistant/festival-service';
import { shrinkageService } from '@/lib/store-assistant/shrinkage-service';
import { healthService } from '@/lib/store-assistant/health-service';
import { supplierRankingService } from '@/lib/store-assistant/supplier-ranking-service';
import { businessCoachService } from '@/lib/store-assistant/business-coach-service';
import { purchaseAutomationService } from '@/lib/store-assistant/purchase-automation-service';
import { vendorCommunicationService } from '@/lib/store-assistant/vendor-communication-service';
import { complianceService } from '@/lib/store-assistant/compliance-service';
import { deliveryService } from '@/lib/store-assistant/delivery-service';
import { customerCommunicationService } from '@/lib/store-assistant/customer-communication-service';
import { priceOptimizerService } from '@/lib/store-assistant/price-optimizer-service';
import { demandScenarioService } from '@/lib/store-assistant/demand-scenario-service';
import { layoutOptimizerService } from '@/lib/store-assistant/layout-optimizer-service';
import { negotiationService } from '@/lib/store-assistant/negotiation-service';
import { lossPreventionService } from '@/lib/store-assistant/loss-prevention-service';
import { expenseService } from '@/lib/store-assistant/expense-service';
import { goalTrackerService } from '@/lib/store-assistant/goal-tracker-service';
import { sopService } from '@/lib/store-assistant/sop-service';
import { benchmarkingService } from '@/lib/store-assistant/benchmarking-service';
import { autonomousEngine } from '@/lib/store-assistant/autonomous-engine';

import { validateStoreAssistantAuth } from '@/lib/store-assistant/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, storeId, ...params } = body;

    if (!action || !storeId) {
      return NextResponse.json({ error: 'Missing required: action, storeId' }, { status: 400 });
    }

    const auth = await validateStoreAssistantAuth(request, action, storeId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const result = await routeAction(action, storeId, params);
    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Store Assistant API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const storeId = url.searchParams.get('storeId');

  if (!action || !storeId) {
    return NextResponse.json({ error: 'Missing required: action, storeId' }, { status: 400 });
  }

  const auth = await validateStoreAssistantAuth(request, action, storeId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const params = Object.fromEntries(url.searchParams.entries());
    delete params.action;
    delete params.storeId;
    const result = await routeAction(action, storeId, params);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function routeAction(action: string, storeId: string, params: any): Promise<any> {
  switch (action) {
    // ── Daily Brief ────────────────────────
    case 'brief.morning':
      return dailyBriefService.getMorningBrief(storeId, params.date);
    case 'brief.closing':
      return dailyBriefService.getClosingBrief(storeId, params.date);
    case 'brief.markRead':
      return dailyBriefService.markAsRead(params.briefId);
    case 'brief.history':
      return dailyBriefService.getBriefHistory(storeId, params.limit);

    // ── Khata (Credit Book) ────────────────
    case 'khata.accounts':
      return khataService.getAccounts(storeId, params.status);
    case 'khata.createAccount':
      return khataService.createAccount(storeId, params.customerId, params.creditLimit, params.notes);
    case 'khata.recordCredit':
      return khataService.recordCredit(storeId, params.accountId, params.amount, params.saleId, params.dueDate, params.notes);
    case 'khata.recordPayment':
      return khataService.recordPayment(storeId, params.accountId, params.amount, params.paymentMethod, params.referenceNumber, params.notes);
    case 'khata.transactions':
      return khataService.getTransactions(params.accountId, params.limit);
    case 'khata.summary':
      return khataService.getStoreSummary(storeId);
    case 'khata.overdue':
      return khataService.getOverdueAccounts(storeId);
    case 'khata.scheduleReminder':
      return khataService.scheduleReminder(storeId, params.accountId, params.channel, params.scheduledAt, params.messageTemplate);

    // ── Tasks ──────────────────────────────
    case 'tasks.list':
      return taskService.getTasks(storeId, params);
    case 'tasks.generate':
      return taskService.generateDailyTasks(storeId);
    case 'tasks.create':
      return taskService.createTask(storeId, params);
    case 'tasks.updateStatus':
      return taskService.updateStatus(params.taskId, params.status);
    case 'tasks.assign':
      return taskService.assignTask(params.taskId, params.assignee);
    case 'tasks.summary':
      return taskService.getTaskSummary(storeId);

    // ── Shelf Management ───────────────────
    case 'shelf.zones':
      return shelfService.getZones(storeId);
    case 'shelf.createZone':
      return shelfService.createZone(storeId, params);
    case 'shelf.refillTasks':
      return shelfService.generateRefillTasks(storeId);
    case 'shelf.walkingRoute':
      return shelfService.getWalkingRoute(storeId);

    // ── Expiry ─────────────────────────────
    case 'expiry.scan':
      return expiryService.scan(storeId);
    case 'expiry.items':
      return expiryService.getExpiringItems(storeId, params.withinDays);
    case 'expiry.executeAction':
      return expiryService.executeAction(storeId, params.productId, params.action);
    case 'expiry.summary':
      return expiryService.getSummary(storeId);

    // ── Dead Inventory ─────────────────────
    case 'deadInventory.detect':
      return deadInventoryService.detect(storeId);

    // ── Cash Intelligence ──────────────────
    case 'cash.intelligence':
      return cashService.getIntelligence(storeId);

    // ── Loyalty ────────────────────────────
    case 'loyalty.segments':
      return loyaltyService.getSegments(storeId);
    case 'loyalty.distribution':
      return loyaltyService.getDistribution(storeId);
    case 'loyalty.resegment':
      return loyaltyService.resegmentAll(storeId);

    // ── Festival Planner ───────────────────
    case 'festival.upcoming':
      return festivalService.getUpcoming(storeId, params.withinDays);
    case 'festival.generatePlan':
      return festivalService.generatePlan(storeId, params.festivalName, params.festivalDate);
    case 'festival.plans':
      return festivalService.getPlans(storeId);

    // ── Shrinkage ──────────────────────────
    case 'shrinkage.detect':
      return shrinkageService.detectShrinkage(storeId);
    case 'shrinkage.reports':
      return shrinkageService.getReports(storeId, params.status);
    case 'shrinkage.summary':
      return shrinkageService.getSummary(storeId);

    // ── Store Health ───────────────────────
    case 'health.compute':
      return healthService.compute(storeId);
    case 'health.history':
      return healthService.getHistory(storeId, params.days);

    // ── Supplier Ranking ───────────────────
    case 'supplier.rank':
      return supplierRankingService.rankSuppliers(storeId);
    case 'supplier.best':
      return supplierRankingService.getBestSupplier(storeId, params.category);

    // ── Business Coach ─────────────────────
    case 'coach.daily':
      return businessCoachService.getDailyAdvice(storeId);
    case 'coach.ask':
      return businessCoachService.askQuestion(storeId, params.question);

    // ── Purchase Automation ────────────────
    case 'purchase.generate':
      return purchaseAutomationService.generateSmartPOs(storeId);
    case 'purchase.createDraft':
      return purchaseAutomationService.createDraftPO(storeId, params.smartPO);
    case 'purchase.pending':
      return purchaseAutomationService.getPendingPOs(storeId);

    // ── Vendor Communications ──────────────
    case 'vendor.draft':
      return vendorCommunicationService.draftMessage(storeId, params.poId, params.channel);
    case 'vendor.send':
      return vendorCommunicationService.sendMessage(params.commId);
    case 'vendor.history':
      return vendorCommunicationService.getHistory(storeId, params.supplierId);
    case 'vendor.followUps':
      return vendorCommunicationService.sendDueFollowUps(storeId);

    // ── GST Compliance ─────────────────────
    case 'compliance.compute':
      return complianceService.computeMonthlyGST(storeId, params.month, params.year);
    case 'compliance.mismatches':
      return complianceService.detectMismatches(storeId, params.month, params.year);
    case 'compliance.deadlines':
      return complianceService.getFilingDeadlines(storeId);
    case 'compliance.history':
      return complianceService.getHistory(storeId, params.months);

    // ── Delivery ───────────────────────────
    case 'delivery.create':
      return deliveryService.createOrder(storeId, params);
    case 'delivery.orders':
      return deliveryService.getOrders(storeId, params.status);
    case 'delivery.optimize':
      return deliveryService.optimizeRoute(storeId);
    case 'delivery.updateStatus':
      return deliveryService.updateStatus(params.orderId, params.status);
    case 'delivery.summary':
      return deliveryService.getSummary(storeId);

    // ── Customer Communications ────────────
    case 'customerComm.schedule':
      return customerCommunicationService.scheduleCommunication(storeId, params);
    case 'customerComm.list':
      return customerCommunicationService.getScheduled(storeId);
    case 'customerComm.sendDue':
      return customerCommunicationService.sendScheduledComms(storeId);
    case 'customerComm.birthday':
      return customerCommunicationService.generateBirthdayWishes(storeId);

    // ── Price Optimizer ────────────────────
    case 'pricing.optimize':
      return priceOptimizerService.getOptimizations(storeId);
    case 'pricing.apply':
      return priceOptimizerService.applyPrice(storeId, params.productId, params.newPrice);
    case 'pricing.rules':
      return priceOptimizerService.getRules(storeId, params.status);

    // ── Demand Scenarios ───────────────────
    case 'scenario.list':
      return demandScenarioService.getAvailableScenarios();
    case 'scenario.simulate':
      return demandScenarioService.simulate(storeId, params.scenarioName, params.durationDays);
    case 'scenario.history':
      return demandScenarioService.getHistory(storeId);

    // ── Layout Optimizer ───────────────────
    case 'layout.generate':
      return layoutOptimizerService.generateRecommendations(storeId);
    case 'layout.list':
      return layoutOptimizerService.getRecommendations(storeId);
    case 'layout.updateStatus':
      return layoutOptimizerService.updateStatus(params.recId, params.status);

    // ── Negotiation ────────────────────────
    case 'negotiation.insights':
      return negotiationService.getInsights(storeId, params.supplierId);
    case 'negotiation.generate':
      return negotiationService.generateInsights(storeId);

    // ── Loss Prevention ────────────────────
    case 'lossPrevention.scan':
      return lossPreventionService.scanForIncidents(storeId);
    case 'lossPrevention.incidents':
      return lossPreventionService.getIncidents(storeId, params.status);
    case 'lossPrevention.summary':
      return lossPreventionService.getSummary(storeId);
    case 'lossPrevention.update':
      return lossPreventionService.updateIncident(params.incidentId, params);

    // ── Expenses ───────────────────────────
    case 'expense.create':
      return expenseService.createExpense(storeId, params);
    case 'expense.list':
      return expenseService.getExpenses(storeId, params.month, params.year);
    case 'expense.breakdown':
      return expenseService.getMonthlyBreakdown(storeId, params.month, params.year);
    case 'expense.savings':
      return expenseService.getSavingsOpportunities(storeId);

    // ── Goals ──────────────────────────────
    case 'goal.create':
      return goalTrackerService.createGoal(storeId, params);
    case 'goal.list':
      return goalTrackerService.getGoals(storeId, params.status);
    case 'goal.updateProgress':
      return goalTrackerService.updateProgress(storeId);

    // ── SOPs ───────────────────────────────
    case 'sop.init':
      return sopService.initializeDefaults(storeId);
    case 'sop.templates':
      return sopService.getTemplates(storeId);
    case 'sop.startExecution':
      return sopService.startExecution(storeId, params.templateId, params.executorName);
    case 'sop.completeStep':
      return sopService.completeStep(params.executionId, params.stepOrder, params.notes);
    case 'sop.executions':
      return sopService.getExecutions(storeId);

    // ── Benchmarking ───────────────────────
    case 'benchmark.compare':
      return benchmarkingService.compare(storeId);

    // ── Autonomous Engine ──────────────────
    case 'autonomous.config':
      return autonomousEngine.getConfig(storeId);
    case 'autonomous.updateConfig':
      return autonomousEngine.updateConfig(storeId, params);
    case 'autonomous.enable':
      return autonomousEngine.enable(storeId);
    case 'autonomous.disable':
      return autonomousEngine.disable(storeId);
    case 'autonomous.runCycle':
      return autonomousEngine.runCycle(storeId);
    case 'autonomous.pending':
      return autonomousEngine.getPendingActions(storeId);
    case 'autonomous.actions':
      return autonomousEngine.getActions(storeId, params.status, params.limit);
    case 'autonomous.approve':
      return autonomousEngine.approveAction(params.actionId, params.userId);
    case 'autonomous.reject':
      return autonomousEngine.rejectAction(params.actionId, params.userId);
    case 'autonomous.summary':
      return autonomousEngine.getSummary(storeId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
