/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Store Automation Suite — Type Definitions
 *
 * Every interface maps 1-to-1 with a database table or a service response.
 * Naming convention: DB row types are suffixed with `Row`, API response types
 * are suffixed with `Response`, and service-internal DTOs have no suffix.
 */

// ═══════════════════════════════════════════════════════════════
// GROUP A: CORE AUTOMATION TYPES
// ═══════════════════════════════════════════════════════════════

// ── Daily Brief ──────────────────────────────────────────────

export interface DailyBriefRow {
  id: string;
  store_id: string;
  brief_type: 'morning' | 'closing';
  brief_date: string;
  data: MorningBriefData | ClosingBriefData;
  ai_summary: string | null;
  is_read: boolean;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MorningBriefData {
  revenue: number;
  profit: number;
  expenses: number;
  bestSellingProducts: ProductBriefItem[];
  worstSellingProducts: ProductBriefItem[];
  stockouts: ProductBriefItem[];
  nearExpiryItems: ExpiryItem[];
  lowInventory: ProductBriefItem[];
  supplierIssues: SupplierIssue[];
  pendingPurchaseOrders: number;
  cashReceived: number;
  upiReceived: number;
  creditOutstanding: number;
  recommendations: string[];
  todaysPriorities: string[];
  estimatedRevenue: number;
  expectedDemandSpikes: DemandSpike[];
  weather: WeatherInfo | null;
  festivals: FestivalInfo[];
  importantAlerts: string[];
}

export interface ClosingBriefData {
  cashCounted: boolean;
  cashAmount: number;
  inventorySynced: boolean;
  purchasesReceived: number;
  pendingInvoices: number;
  gstGenerated: number;
  outstandingCredits: number;
  todaysProfit: number;
  inventoryMismatch: number;
  nearExpiry: number;
  ordersPending: number;
  recommendationsExecuted: number;
  totalRecommendations: number;
  checklist: ChecklistItem[];
}

export interface ProductBriefItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  value: number;
  unit?: string;
}

export interface ExpiryItem {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  value: number;
  recommendedAction: 'discount' | 'return_supplier' | 'bundle' | 'donate' | 'promotion' | 'monitor';
}

export interface SupplierIssue {
  supplierId: string;
  supplierName: string;
  issue: string;
  poNumber?: string;
}

export interface DemandSpike {
  product: string;
  category: string;
  expectedIncrease: number;
  reason: string;
}

export interface WeatherInfo {
  temp: number;
  condition: string;
  impact: string;
}

export interface FestivalInfo {
  name: string;
  date: string;
  daysAway: number;
  preparation: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  value?: string | number;
}

// ── Khata (Credit Book) ─────────────────────────────────────

export interface KhataAccountRow {
  id: string;
  store_id: string;
  customer_id: string;
  credit_limit: number;
  outstanding_balance: number;
  interest_rate: number;
  auto_remind: boolean;
  remind_after_days: number;
  status: 'active' | 'overdue' | 'settled' | 'blocked';
  payment_prediction_date: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  customer_phone?: string;
}

export interface KhataTransactionRow {
  id: string;
  account_id: string;
  store_id: string;
  type: 'credit_given' | 'payment_received' | 'interest' | 'adjustment';
  amount: number;
  running_balance: number;
  sale_id: string | null;
  payment_method: string | null;
  reference_number: string | null;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KhataReminderRow {
  id: string;
  account_id: string;
  store_id: string;
  channel: 'whatsapp' | 'sms' | 'in_app';
  message_template: string | null;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  response: string | null;
  created_at: string;
}

// ── Employee Tasks ──────────────────────────────────────────

export type TaskType = 'shelf_refill' | 'inventory_count' | 'cleaning' | 'expiry_check' |
  'receive_delivery' | 'stock_transfer' | 'price_update' | 'promotion_setup' | 'custom';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface EmployeeTaskRow {
  id: string;
  store_id: string;
  task_type: TaskType;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  zone_code: string | null;
  product_ids: string[];
  metadata: Record<string, any>;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

// ── Shelf Zones ─────────────────────────────────────────────

export interface ShelfZoneRow {
  id: string;
  store_id: string;
  zone_code: string;
  zone_name: string;
  category_affinity: string | null;
  display_order: number;
  walking_sequence: number;
  capacity_units: number;
  current_fill_pct: number;
  created_at: string;
  updated_at: string;
}

export interface RefillTask {
  zoneCode: string;
  zoneName: string;
  products: { name: string; currentShelf: number; target: number; refillQty: number }[];
  priority: TaskPriority;
  walkingOrder: number;
}

// ── Shrinkage ───────────────────────────────────────────────

export type ShrinkageCategory = 'theft' | 'damage' | 'admin_error' | 'supplier_short' | 'unknown';

export interface ShrinkageReportRow {
  id: string;
  store_id: string;
  report_date: string;
  product_id: string | null;
  product_name: string;
  expected_qty: number;
  actual_qty: number;
  variance: number;
  variance_value: number;
  category: ShrinkageCategory;
  investigation_status: 'open' | 'investigating' | 'resolved' | 'written_off';
  notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Festival Plans ──────────────────────────────────────────

export interface FestivalPlanRow {
  id: string;
  store_id: string;
  festival_name: string;
  festival_date: string;
  lead_time_days: number;
  demand_forecast: Record<string, number>;
  purchase_order_ids: string[];
  staff_requirements: Record<string, any>;
  promotion_plan: Record<string, any>;
  status: 'draft' | 'planned' | 'executing' | 'completed';
  auto_generated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Loyalty Segments ────────────────────────────────────────

export type LoyaltySegment = 'vip' | 'frequent' | 'seasonal' | 'regular' | 'inactive' | 'lost';

export interface LoyaltySegmentRow {
  id: string;
  store_id: string;
  customer_id: string;
  segment: LoyaltySegment;
  loyalty_score: number;
  total_lifetime_value: number;
  visit_frequency_days: number;
  last_visit_date: string | null;
  recommended_actions: LoyaltyAction[];
  created_at: string;
  updated_at: string;
  // Joined
  customer_name?: string;
  customer_phone?: string;
}

export interface LoyaltyAction {
  type: 'coupon' | 'discount' | 'reward' | 'bundle' | 'reactivation';
  description: string;
  expectedImpact: string;
}

// ── Store Health ────────────────────────────────────────────

export interface StoreHealthRow {
  id: string;
  store_id: string;
  snapshot_date: string;
  overall_score: number;
  dimensions: HealthDimensions;
  recommendations: string[];
  trend: 'improving' | 'stable' | 'declining';
  created_at: string;
}

export interface HealthDimensions {
  inventory: number;
  cash: number;
  profit: number;
  expiry: number;
  forecastAccuracy: number;
  supplierHealth: number;
  recommendationAdoption: number;
  employeePerformance: number;
  salesTrend: number;
}

// ═══════════════════════════════════════════════════════════════
// GROUP B: ENTERPRISE CAPABILITY TYPES
// ═══════════════════════════════════════════════════════════════

// ── Vendor Communications ───────────────────────────────────

export interface VendorCommRow {
  id: string;
  store_id: string;
  supplier_id: string;
  po_id: string | null;
  channel: 'whatsapp' | 'email' | 'sms';
  direction: 'outgoing' | 'incoming';
  message_type: 'po_send' | 'follow_up' | 'delivery_confirm' | 'negotiation' | 'reminder' | 'acknowledgement';
  subject: string | null;
  body: string;
  status: 'draft' | 'approved' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  follow_up_count: number;
  max_follow_ups: number;
  next_follow_up_at: string | null;
  supplier_response: string | null;
  response_received_at: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  po_number?: string;
}

// ── GST Compliance ──────────────────────────────────────────

export interface GSTComplianceRow {
  id: string;
  store_id: string;
  period_month: number;
  period_year: number;
  total_sales_taxable: number;
  total_sales_gst: number;
  cgst_collected: number;
  sgst_collected: number;
  igst_collected: number;
  total_purchase_taxable: number;
  total_purchase_gst: number;
  itc_cgst: number;
  itc_sgst: number;
  itc_igst: number;
  net_gst_liability: number;
  hsn_summary: HSNSummaryItem[];
  gstr1_status: 'pending' | 'prepared' | 'filed';
  gstr3b_status: 'pending' | 'prepared' | 'filed';
  filing_due_date: string | null;
  filed_at: string | null;
  mismatches: GSTMismatch[];
  mismatch_count: number;
  tds_applicable: boolean;
  tds_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HSNSummaryItem {
  hsnCode: string;
  description: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  quantity: number;
}

export interface GSTMismatch {
  invoiceNumber: string;
  expectedAmount: number;
  actualAmount: number;
  type: 'sales_tax' | 'purchase_tax' | 'hsn' | 'rate';
  description: string;
}

// ── Delivery Orders ─────────────────────────────────────────

export interface DeliveryOrderRow {
  id: string;
  store_id: string;
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string;
  delivery_address: string;
  phone: string | null;
  driver_name: string | null;
  status: 'pending' | 'assigned' | 'picked' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  priority: number;
  delivery_sequence: number | null;
  estimated_distance_km: number | null;
  estimated_time_mins: number | null;
  estimated_fuel_cost: number | null;
  scheduled_at: string | null;
  picked_at: string | null;
  delivered_at: string | null;
  delivery_proof: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Customer Communications ─────────────────────────────────

export type CustomerCommType = 'birthday' | 'festival' | 'offer' | 'back_in_stock' |
  'order_ready' | 'payment_reminder' | 'coupon_expiry' | 'loyalty_reward' | 'thank_you';

export interface CustomerCommRow {
  id: string;
  store_id: string;
  customer_id: string | null;
  channel: 'whatsapp' | 'sms' | 'in_app';
  comm_type: CustomerCommType;
  subject: string | null;
  body: string;
  status: 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduled_at: string;
  sent_at: string | null;
  auto_generated: boolean;
  metadata: Record<string, any>;
  created_at: string;
  // Joined
  customer_name?: string;
}

// ── Price Rules ─────────────────────────────────────────────

export type PriceRuleType = 'margin_floor' | 'margin_ceiling' | 'demand_elastic' |
  'expiry_discount' | 'bundle' | 'bogo' | 'combo' | 'clearance' | 'competitor_match';

export interface PriceRuleRow {
  id: string;
  store_id: string;
  product_id: string | null;
  category: string | null;
  rule_type: PriceRuleType;
  current_price: number | null;
  recommended_price: number | null;
  min_price: number | null;
  max_price: number | null;
  discount_pct: number;
  justification: string | null;
  demand_elasticity: number | null;
  expected_revenue_impact: number | null;
  status: 'suggested' | 'approved' | 'applied' | 'rejected';
  auto_apply: boolean;
  applied_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  product_name?: string;
}

// ── Demand Scenarios ────────────────────────────────────────

export type ScenarioType = 'weather' | 'festival' | 'disruption' | 'economic' | 'seasonal' | 'custom';

export interface DemandScenarioRow {
  id: string;
  store_id: string;
  scenario_name: string;
  scenario_type: ScenarioType;
  parameters: ScenarioParams;
  baseline_demand: Record<string, number>;
  simulated_demand: Record<string, number>;
  impact_summary: ScenarioImpact;
  recommended_actions: string[];
  created_at: string;
}

export interface ScenarioParams {
  durationDays: number;
  severity: 'mild' | 'moderate' | 'severe';
  affectedCategories: string[];
}

export interface ScenarioImpact {
  revenueDelta: number;
  revenueDeltaPct: number;
  stockoutRisk: number;
  topAffectedProducts: { name: string; impact: number }[];
}

// ── Layout Recommendations ──────────────────────────────────

export interface LayoutRecommendationRow {
  id: string;
  store_id: string;
  recommendation_type: 'relocate' | 'cross_merchandise' | 'impulse_zone' | 'dead_zone_fix' | 'traffic_flow';
  product_id: string | null;
  product_name: string | null;
  from_zone: string | null;
  to_zone: string | null;
  rationale: string;
  expected_impact: string | null;
  priority: string;
  status: 'pending' | 'accepted' | 'implemented' | 'rejected';
  implemented_at: string | null;
  created_at: string;
}

// ── Negotiation Insights ────────────────────────────────────

export type NegotiationInsightType = 'discount_pattern' | 'best_time' | 'bulk_threshold' |
  'combine_sku' | 'wait_signal' | 'competitor_leverage';

export interface NegotiationInsightRow {
  id: string;
  store_id: string;
  supplier_id: string;
  insight_type: NegotiationInsightType;
  insight_text: string;
  confidence: number;
  data_points: Record<string, any>;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
}

// ── Loss Incidents ──────────────────────────────────────────

export type LossIncidentType = 'fake_return' | 'repeated_discount' | 'cash_leak' |
  'employee_abuse' | 'invoice_manipulation' | 'void_abuse' | 'refund_abuse' |
  'cash_drawer_mismatch' | 'frequent_correction' | 'late_settlement' | 'odd_pattern';

export interface LossIncidentRow {
  id: string;
  store_id: string;
  incident_type: LossIncidentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  estimated_loss: number;
  involved_entity: string | null;
  status: 'open' | 'investigating' | 'confirmed' | 'resolved' | 'false_positive';
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Expenses ────────────────────────────────────────────────

export type ExpenseType = 'electricity' | 'rent' | 'salary' | 'packaging' |
  'transportation' | 'internet' | 'repairs' | 'insurance' | 'license' | 'miscellaneous';

export interface ExpenseRow {
  id: string;
  store_id: string;
  expense_type: ExpenseType;
  amount: number;
  description: string | null;
  vendor: string | null;
  payment_method: string;
  receipt_ref: string | null;
  expense_date: string;
  is_recurring: boolean;
  recurrence_period: string | null;
  budget_amount: number | null;
  created_at: string;
  updated_at: string;
}

// ── Store Goals ─────────────────────────────────────────────

export interface StoreGoalRow {
  id: string;
  store_id: string;
  goal_type: 'revenue' | 'profit' | 'margin' | 'customers' | 'inventory_turns' | 'expense_reduction' | 'custom';
  title: string;
  target_value: number;
  current_value: number;
  baseline_value: number;
  unit: string;
  target_date: string;
  progress_pct: number;
  status: 'active' | 'on_track' | 'at_risk' | 'achieved' | 'missed';
  ai_recommendations: string[];
  milestones: GoalMilestone[];
  daily_coaching: GoalCoaching[];
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  date: string;
  target: number;
  actual: number;
}

export interface GoalCoaching {
  date: string;
  advice: string;
  actionsTaken: string[];
}

// ── SOP Templates & Executions ──────────────────────────────

export interface SOPTemplateRow {
  id: string;
  store_id: string;
  name: string;
  category: 'operations' | 'inventory' | 'hr' | 'safety' | 'custom';
  steps: SOPStep[];
  estimated_total_mins: number;
  is_active: boolean;
  auto_generated: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SOPStep {
  order: number;
  title: string;
  description: string;
  estimatedMins: number;
  required: boolean;
}

export interface SOPExecutionRow {
  id: string;
  template_id: string;
  store_id: string;
  executor_name: string;
  execution_date: string;
  started_at: string;
  completed_at: string | null;
  step_results: SOPStepResult[];
  completion_pct: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes: string | null;
  created_at: string;
}

export interface SOPStepResult {
  stepOrder: number;
  status: 'done' | 'skipped' | 'pending';
  completedAt: string | null;
  notes: string | null;
}

// ═══════════════════════════════════════════════════════════════
// AUTONOMOUS STORE MODE TYPES
// ═══════════════════════════════════════════════════════════════

export type AutonomousActionType = 'purchase_order' | 'supplier_communication' |
  'task_assignment' | 'price_change' | 'expiry_action' | 'customer_reminder' |
  'khata_reminder' | 'festival_prep' | 'report_generation' | 'stockout_order' |
  'health_alert' | 'compliance_alert';

export interface AutonomousActionRow {
  id: string;
  store_id: string;
  action_type: AutonomousActionType;
  action_title: string;
  action_description: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  data: Record<string, any>;
  reference_id: string | null;
  reference_table: string | null;
  approval_status: 'pending' | 'auto_approved' | 'approved' | 'rejected' | 'expired';
  auto_approved: boolean;
  approval_rule: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: Record<string, any>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutonomousConfigRow {
  id: string;
  store_id: string;
  is_enabled: boolean;
  auto_purchase_orders: boolean;
  auto_supplier_comms: boolean;
  auto_employee_tasks: boolean;
  auto_morning_brief: boolean;
  auto_closing_report: boolean;
  auto_stockout_orders: boolean;
  auto_expiry_actions: boolean;
  auto_customer_reminders: boolean;
  auto_khata_reminders: boolean;
  auto_festival_prep: boolean;
  auto_pricing: boolean;
  auto_health_alerts: boolean;
  auto_compliance_prep: boolean;
  po_auto_approve_limit: number;
  price_change_max_pct: number;
  expiry_auto_discount_days: number;
  expiry_auto_discount_pct: number;
  stockout_auto_order_days: number;
  escalation_channels: string[];
  quiet_hours_start: string;
  quiet_hours_end: string;
  enabled_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  priceScore: number;
  reliabilityScore: number;
  leadTimeScore: number;
  defectRateScore: number;
  availabilityScore: number;
  creditPeriodScore: number;
  historicalScore: number;
  rank: 'best' | 'good' | 'avoid';
}

export interface PriceOptimization {
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  strategy: 'increase' | 'decrease' | 'bundle' | 'bogo' | 'combo' | 'clearance';
  justification: string;
  factors: {
    demand: number;
    competition: number;
    inventory: number;
    expiry: number;
    elasticity: number;
    margin: number;
  };
  expectedImpact: {
    revenueDelta: number;
    marginDelta: number;
    unitsSoldDelta: number;
  };
}

export interface WorkingCapitalReport {
  totalCapitalDeployed: number;
  fastMovingCapital: number;
  slowMovingCapital: number;
  deadCapital: number;
  creditExposure: number;
  supplierLiabilities: number;
  expectedCollections: number;
  cashRunwayDays: number;
  recommendations: string[];
}

export interface ExpansionAnalysis {
  isReady: boolean;
  readinessScore: number;
  currentStoreMetrics: {
    monthlyRevenue: number;
    monthlyProfit: number;
    profitMargin: number;
    growthRate: number;
    operatingCapacity: number;
  };
  projectedInvestment: {
    estimatedSetupCost: number;
    estimatedMonthlyOpex: number;
    breakEvenMonths: number;
    projectedROI: number;
  };
  risks: string[];
  recommendations: string[];
}

export interface BillingRecommendation {
  triggerProduct: string;
  recommendations: {
    product: string;
    reason: string;
    margin: number;
  }[];
}

export interface AutonomousCycleResult {
  skipped?: boolean;
  totalActions: number;
  autoApproved: number;
  pendingApproval: number;
  errors: number;
  executedAt: string;
}
