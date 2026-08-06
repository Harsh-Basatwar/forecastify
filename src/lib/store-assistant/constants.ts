/**
 * Store Automation Suite — Constants
 *
 * Indian festivals, task types, expense categories, SOP templates,
 * demand scenario definitions, and all static configuration used
 * across the store automation services.
 */

// ═══════════════════════════════════════════════════════════════
// INDIAN FESTIVAL CALENDAR
// ═══════════════════════════════════════════════════════════════

export interface FestivalDefinition {
  name: string;
  /** Approximate month (1-12) and day — variable festivals use best estimate */
  approxMonth: number;
  approxDay: number;
  /** Set true for festivals with variable dates (Islamic, lunar) */
  variableDate: boolean;
  leadDays: number;
  demandMultiplier: number;
  highDemandCategories: string[];
  /** Typical promotion types */
  promotionTypes: string[];
}

export const FESTIVALS: FestivalDefinition[] = [
  { name: 'Makar Sankranti', approxMonth: 1, approxDay: 14, variableDate: false, leadDays: 7, demandMultiplier: 1.4, highDemandCategories: ['Sesame', 'Jaggery', 'Sweets', 'Groceries'], promotionTypes: ['combo', 'discount'] },
  { name: 'Republic Day', approxMonth: 1, approxDay: 26, variableDate: false, leadDays: 3, demandMultiplier: 1.2, highDemandCategories: ['Beverages', 'Snacks', 'Sweets'], promotionTypes: ['bundle'] },
  { name: 'Holi', approxMonth: 3, approxDay: 14, variableDate: true, leadDays: 14, demandMultiplier: 1.8, highDemandCategories: ['Beverages', 'Snacks', 'Personal Care', 'Colors', 'Sweets'], promotionTypes: ['bogo', 'combo', 'discount'] },
  { name: 'Ugadi / Gudi Padwa', approxMonth: 3, approxDay: 22, variableDate: true, leadDays: 7, demandMultiplier: 1.5, highDemandCategories: ['Groceries', 'Sweets', 'Puja Items'], promotionTypes: ['combo'] },
  { name: 'Ram Navami', approxMonth: 4, approxDay: 6, variableDate: true, leadDays: 5, demandMultiplier: 1.3, highDemandCategories: ['Groceries', 'Puja Items', 'Sweets'], promotionTypes: ['discount'] },
  { name: 'Eid ul-Fitr', approxMonth: 4, approxDay: 10, variableDate: true, leadDays: 14, demandMultiplier: 2.0, highDemandCategories: ['Groceries', 'Dairy', 'Beverages', 'Dry Fruits', 'Sweets'], promotionTypes: ['combo', 'bundle', 'discount'] },
  { name: 'Independence Day', approxMonth: 8, approxDay: 15, variableDate: false, leadDays: 3, demandMultiplier: 1.2, highDemandCategories: ['Beverages', 'Snacks', 'Sweets'], promotionTypes: ['bundle'] },
  { name: 'Raksha Bandhan', approxMonth: 8, approxDay: 19, variableDate: true, leadDays: 10, demandMultiplier: 1.6, highDemandCategories: ['Sweets', 'Dry Fruits', 'Chocolates', 'Gifts'], promotionTypes: ['bundle', 'combo'] },
  { name: 'Janmashtami', approxMonth: 8, approxDay: 26, variableDate: true, leadDays: 7, demandMultiplier: 1.5, highDemandCategories: ['Dairy', 'Sweets', 'Groceries', 'Puja Items'], promotionTypes: ['combo'] },
  { name: 'Ganesh Chaturthi', approxMonth: 9, approxDay: 7, variableDate: true, leadDays: 14, demandMultiplier: 1.8, highDemandCategories: ['Sweets', 'Puja Items', 'Groceries', 'Dry Fruits'], promotionTypes: ['combo', 'bundle'] },
  { name: 'Eid ul-Adha', approxMonth: 6, approxDay: 17, variableDate: true, leadDays: 14, demandMultiplier: 1.8, highDemandCategories: ['Groceries', 'Dairy', 'Beverages'], promotionTypes: ['combo', 'discount'] },
  { name: 'Navratri', approxMonth: 10, approxDay: 3, variableDate: true, leadDays: 14, demandMultiplier: 1.7, highDemandCategories: ['Groceries', 'Puja Items', 'Sweets', 'Fasting Foods'], promotionTypes: ['bundle', 'combo'] },
  { name: 'Dussehra', approxMonth: 10, approxDay: 12, variableDate: true, leadDays: 7, demandMultiplier: 1.5, highDemandCategories: ['Sweets', 'Snacks', 'Beverages'], promotionTypes: ['discount'] },
  { name: 'Karwa Chauth', approxMonth: 10, approxDay: 17, variableDate: true, leadDays: 5, demandMultiplier: 1.3, highDemandCategories: ['Sweets', 'Dry Fruits', 'Puja Items'], promotionTypes: ['combo'] },
  { name: 'Diwali', approxMonth: 10, approxDay: 22, variableDate: true, leadDays: 21, demandMultiplier: 2.5, highDemandCategories: ['Snacks', 'Dry Fruits', 'Sweets', 'Household', 'Puja Items', 'Gifts', 'Chocolates'], promotionTypes: ['bogo', 'bundle', 'combo', 'discount', 'clearance'] },
  { name: 'Bhai Dooj', approxMonth: 10, approxDay: 24, variableDate: true, leadDays: 5, demandMultiplier: 1.4, highDemandCategories: ['Sweets', 'Dry Fruits', 'Gifts'], promotionTypes: ['bundle'] },
  { name: 'Christmas', approxMonth: 12, approxDay: 25, variableDate: false, leadDays: 14, demandMultiplier: 1.5, highDemandCategories: ['Beverages', 'Snacks', 'Chocolates', 'Cakes'], promotionTypes: ['bundle', 'discount'] },
  { name: 'New Year', approxMonth: 1, approxDay: 1, variableDate: false, leadDays: 7, demandMultiplier: 1.6, highDemandCategories: ['Beverages', 'Snacks', 'Party Supplies'], promotionTypes: ['combo', 'bundle'] },
  { name: 'Pongal', approxMonth: 1, approxDay: 15, variableDate: false, leadDays: 7, demandMultiplier: 1.5, highDemandCategories: ['Rice', 'Jaggery', 'Groceries', 'Dairy'], promotionTypes: ['combo'] },
  { name: 'Onam', approxMonth: 9, approxDay: 15, variableDate: true, leadDays: 14, demandMultiplier: 1.8, highDemandCategories: ['Rice', 'Coconut', 'Spices', 'Groceries'], promotionTypes: ['bundle', 'combo'] },
];

// ═══════════════════════════════════════════════════════════════
// SEASONAL EVENTS
// ═══════════════════════════════════════════════════════════════

export interface SeasonalEvent {
  name: string;
  months: number[];
  highDemandCategories: string[];
  demandMultiplier: number;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  { name: 'Summer', months: [4, 5, 6], highDemandCategories: ['Beverages', 'Ice Cream', 'Sunscreen', 'Juices', 'Water'], demandMultiplier: 1.4 },
  { name: 'Monsoon', months: [7, 8, 9], highDemandCategories: ['Umbrellas', 'Tea', 'Coffee', 'Biscuits', 'Instant Noodles'], demandMultiplier: 1.2 },
  { name: 'Winter', months: [11, 12, 1], highDemandCategories: ['Dry Fruits', 'Hot Beverages', 'Soups', 'Honey'], demandMultiplier: 1.3 },
  { name: 'Back to School', months: [6], highDemandCategories: ['Stationery', 'Snacks', 'Lunch Boxes', 'Water Bottles'], demandMultiplier: 1.5 },
  { name: 'Wedding Season', months: [11, 12, 1, 2], highDemandCategories: ['Dry Fruits', 'Sweets', 'Gifts', 'Decorations'], demandMultiplier: 1.6 },
  { name: 'IPL Season', months: [4, 5], highDemandCategories: ['Snacks', 'Beverages', 'Ready-to-eat', 'Chips'], demandMultiplier: 1.3 },
  { name: 'Exam Season', months: [3, 4, 5], highDemandCategories: ['Stationery', 'Energy Drinks', 'Snacks'], demandMultiplier: 1.2 },
];

// ═══════════════════════════════════════════════════════════════
// DEMAND SHOCK SCENARIOS
// ═══════════════════════════════════════════════════════════════

export interface DemandScenarioDefinition {
  name: string;
  type: 'weather' | 'festival' | 'disruption' | 'economic' | 'seasonal' | 'custom';
  description: string;
  categoryImpact: Record<string, number>;
  defaultDuration: number;
  defaultSeverity: 'mild' | 'moderate' | 'severe';
}

export const DEMAND_SCENARIOS: DemandScenarioDefinition[] = [
  { name: 'Heavy Rain', type: 'weather', description: 'Continuous rain reduces footfall but increases essential demand', categoryImpact: { Dairy: 0.7, Beverages: 1.3, Groceries: 1.5, 'Personal Care': 0.6, Snacks: 0.8 }, defaultDuration: 3, defaultSeverity: 'moderate' },
  { name: 'Heat Wave', type: 'weather', description: 'Extreme heat increases beverage and cooling product demand', categoryImpact: { Beverages: 2.0, 'Ice Cream': 2.5, Water: 2.0, Dairy: 1.3, Snacks: 0.9 }, defaultDuration: 7, defaultSeverity: 'moderate' },
  { name: 'Transport Strike', type: 'disruption', description: 'Supply chain disruption reduces new stock availability', categoryImpact: { Groceries: 0.4, Dairy: 0.3, Beverages: 0.5, Snacks: 0.4, 'Personal Care': 0.6 }, defaultDuration: 5, defaultSeverity: 'severe' },
  { name: 'Supplier Unavailable', type: 'disruption', description: 'Key supplier cannot fulfill orders', categoryImpact: {}, defaultDuration: 14, defaultSeverity: 'moderate' },
  { name: 'Petrol Price +20%', type: 'economic', description: 'Fuel cost increase affects delivery and customer footfall', categoryImpact: { Groceries: 0.95, Beverages: 0.93, Snacks: 0.9, 'Personal Care': 0.92 }, defaultDuration: 30, defaultSeverity: 'mild' },
  { name: 'School Reopening', type: 'seasonal', description: 'Schools reopen driving stationery and snack demand', categoryImpact: { Stationery: 3.0, Snacks: 1.5, Beverages: 1.3, 'Lunch Boxes': 2.5 }, defaultDuration: 14, defaultSeverity: 'moderate' },
  { name: 'Tourist Season', type: 'seasonal', description: 'Influx of tourists increases impulse and beverage purchases', categoryImpact: { Beverages: 2.0, Snacks: 1.8, 'Personal Care': 1.5, Water: 2.0 }, defaultDuration: 60, defaultSeverity: 'moderate' },
  { name: 'Government Lockdown', type: 'disruption', description: 'Restrictions on movement, essential-only shopping', categoryImpact: { Groceries: 2.0, Dairy: 1.8, 'Personal Care': 1.5, Snacks: 0.3, Beverages: 0.4 }, defaultDuration: 14, defaultSeverity: 'severe' },
  { name: 'Festival Rush', type: 'festival', description: 'Major festival creates surge in gift and food categories', categoryImpact: { Snacks: 2.5, Sweets: 3.0, 'Dry Fruits': 2.0, Beverages: 1.5, Gifts: 2.5 }, defaultDuration: 7, defaultSeverity: 'moderate' },
  { name: 'Competitor Closed', type: 'economic', description: 'Nearby competitor shop closed temporarily', categoryImpact: { Groceries: 1.4, Beverages: 1.3, Snacks: 1.4, Dairy: 1.3, 'Personal Care': 1.3 }, defaultDuration: 14, defaultSeverity: 'mild' },
];

// ═══════════════════════════════════════════════════════════════
// TASK TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface TaskTypeDefinition {
  type: string;
  label: string;
  icon: string;
  defaultPriority: 'critical' | 'high' | 'medium' | 'low';
  estimatedMins: number;
}

export const TASK_TYPES: TaskTypeDefinition[] = [
  { type: 'shelf_refill', label: 'Shelf Refill', icon: 'Package', defaultPriority: 'high', estimatedMins: 15 },
  { type: 'inventory_count', label: 'Inventory Count', icon: 'ClipboardList', defaultPriority: 'medium', estimatedMins: 30 },
  { type: 'cleaning', label: 'Cleaning', icon: 'Sparkles', defaultPriority: 'medium', estimatedMins: 20 },
  { type: 'expiry_check', label: 'Expiry Check', icon: 'Clock', defaultPriority: 'high', estimatedMins: 15 },
  { type: 'receive_delivery', label: 'Receive Delivery', icon: 'Truck', defaultPriority: 'high', estimatedMins: 30 },
  { type: 'stock_transfer', label: 'Stock Transfer', icon: 'ArrowRightLeft', defaultPriority: 'medium', estimatedMins: 15 },
  { type: 'price_update', label: 'Price Update', icon: 'Tag', defaultPriority: 'medium', estimatedMins: 10 },
  { type: 'promotion_setup', label: 'Promotion Setup', icon: 'Megaphone', defaultPriority: 'low', estimatedMins: 20 },
  { type: 'custom', label: 'Custom Task', icon: 'ListTodo', defaultPriority: 'medium', estimatedMins: 15 },
];

// ═══════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES
// ═══════════════════════════════════════════════════════════════

export interface ExpenseCategoryDefinition {
  type: string;
  label: string;
  icon: string;
  isRecurring: boolean;
  typicalRange: { min: number; max: number };
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = [
  { type: 'electricity', label: 'Electricity', icon: 'Zap', isRecurring: true, typicalRange: { min: 2000, max: 15000 } },
  { type: 'rent', label: 'Rent', icon: 'Home', isRecurring: true, typicalRange: { min: 10000, max: 100000 } },
  { type: 'salary', label: 'Staff Salary', icon: 'Users', isRecurring: true, typicalRange: { min: 8000, max: 50000 } },
  { type: 'packaging', label: 'Packaging', icon: 'Package', isRecurring: false, typicalRange: { min: 500, max: 5000 } },
  { type: 'transportation', label: 'Transportation', icon: 'Truck', isRecurring: false, typicalRange: { min: 2000, max: 10000 } },
  { type: 'internet', label: 'Internet & Phone', icon: 'Wifi', isRecurring: true, typicalRange: { min: 500, max: 3000 } },
  { type: 'repairs', label: 'Repairs & Maintenance', icon: 'Wrench', isRecurring: false, typicalRange: { min: 500, max: 20000 } },
  { type: 'insurance', label: 'Insurance', icon: 'Shield', isRecurring: true, typicalRange: { min: 1000, max: 10000 } },
  { type: 'license', label: 'Licenses & Permits', icon: 'FileText', isRecurring: true, typicalRange: { min: 500, max: 25000 } },
  { type: 'miscellaneous', label: 'Miscellaneous', icon: 'MoreHorizontal', isRecurring: false, typicalRange: { min: 100, max: 10000 } },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT SOP TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface DefaultSOPTemplate {
  name: string;
  category: 'operations' | 'inventory' | 'hr' | 'safety' | 'custom';
  steps: { order: number; title: string; description: string; estimatedMins: number; required: boolean }[];
}

export const DEFAULT_SOPS: DefaultSOPTemplate[] = [
  {
    name: 'Store Opening',
    category: 'operations',
    steps: [
      { order: 1, title: 'Unlock and inspect premises', description: 'Check for any security issues, damage, or unusual activity overnight', estimatedMins: 5, required: true },
      { order: 2, title: 'Turn on lights, AC, refrigerators', description: 'Ensure all electrical equipment is powered on and functioning', estimatedMins: 2, required: true },
      { order: 3, title: 'Count opening cash drawer', description: 'Verify opening cash balance matches previous closing balance', estimatedMins: 5, required: true },
      { order: 4, title: 'Check morning brief on Forecastify', description: 'Review AI-generated morning brief for priorities and alerts', estimatedMins: 3, required: true },
      { order: 5, title: 'Review and assign employee tasks', description: 'Check auto-generated tasks and assign to available staff', estimatedMins: 5, required: true },
      { order: 6, title: 'Check expiry alerts', description: 'Review items expiring today and take recommended actions', estimatedMins: 3, required: true },
      { order: 7, title: 'Verify shelf stock levels', description: 'Walk aisles and verify shelves are adequately stocked', estimatedMins: 10, required: false },
      { order: 8, title: 'Open POS system', description: 'Start billing system and verify it is operational', estimatedMins: 2, required: true },
    ],
  },
  {
    name: 'Store Closing',
    category: 'operations',
    steps: [
      { order: 1, title: 'Complete all pending sales', description: 'Finish any active billing transactions', estimatedMins: 5, required: true },
      { order: 2, title: 'Count and reconcile cash drawer', description: 'Count all cash and reconcile with POS system total', estimatedMins: 10, required: true },
      { order: 3, title: 'Review closing report on Forecastify', description: 'Check auto-generated closing report and verify data', estimatedMins: 3, required: true },
      { order: 4, title: 'Check for pending deliveries', description: 'Verify all expected deliveries were received today', estimatedMins: 2, required: false },
      { order: 5, title: 'Verify expiry items handled', description: 'Confirm all flagged expiry items were actioned', estimatedMins: 3, required: true },
      { order: 6, title: 'Lock refrigerators, turn off AC', description: 'Secure cold storage and turn off non-essential equipment', estimatedMins: 2, required: true },
      { order: 7, title: 'Security check — all exits', description: 'Verify all doors, windows, and exits are secured', estimatedMins: 5, required: true },
      { order: 8, title: 'Lock premises', description: 'Final lock-up and alarm activation if applicable', estimatedMins: 2, required: true },
    ],
  },
  {
    name: 'Receiving Stock',
    category: 'inventory',
    steps: [
      { order: 1, title: 'Verify delivery against PO', description: 'Check delivered items match purchase order quantities', estimatedMins: 10, required: true },
      { order: 2, title: 'Inspect quality', description: 'Check for damaged, expired, or wrong items', estimatedMins: 10, required: true },
      { order: 3, title: 'Check expiry dates', description: 'Verify all items have acceptable shelf life remaining', estimatedMins: 5, required: true },
      { order: 4, title: 'Update inventory in system', description: 'Record received quantities in Forecastify', estimatedMins: 5, required: true },
      { order: 5, title: 'Store in correct location', description: 'Place items in designated shelf zones', estimatedMins: 15, required: true },
      { order: 6, title: 'Report discrepancies', description: 'Note any quantity or quality issues for follow-up', estimatedMins: 5, required: false },
    ],
  },
  {
    name: 'Returns Processing',
    category: 'inventory',
    steps: [
      { order: 1, title: 'Verify customer receipt', description: 'Confirm original purchase with invoice/receipt', estimatedMins: 2, required: true },
      { order: 2, title: 'Inspect returned item', description: 'Check condition of returned product', estimatedMins: 3, required: true },
      { order: 3, title: 'Determine return category', description: 'Classify as damaged, expired, wrong item, or change of mind', estimatedMins: 2, required: true },
      { order: 4, title: 'Process refund/exchange', description: 'Issue refund or exchange as per store policy', estimatedMins: 3, required: true },
      { order: 5, title: 'Update inventory', description: 'Restock if item is in sellable condition', estimatedMins: 2, required: true },
      { order: 6, title: 'Record in system', description: 'Log return in Forecastify for tracking', estimatedMins: 2, required: true },
    ],
  },
  {
    name: 'Expiry Management',
    category: 'inventory',
    steps: [
      { order: 1, title: 'Check Forecastify expiry alerts', description: 'Review items flagged for today, tomorrow, 7-day, 30-day expiry', estimatedMins: 3, required: true },
      { order: 2, title: 'Pull expiring items from shelf', description: 'Remove items expiring today or tomorrow', estimatedMins: 10, required: true },
      { order: 3, title: 'Apply discount labels', description: 'Mark items for clearance as recommended by AI', estimatedMins: 5, required: false },
      { order: 4, title: 'Process supplier returns', description: 'Pack items eligible for supplier return', estimatedMins: 10, required: false },
      { order: 5, title: 'Dispose of expired items', description: 'Remove and properly dispose of expired products', estimatedMins: 5, required: true },
      { order: 6, title: 'Update inventory', description: 'Record all disposals and adjustments in system', estimatedMins: 3, required: true },
    ],
  },
  {
    name: 'Employee Onboarding',
    category: 'hr',
    steps: [
      { order: 1, title: 'Welcome and orientation', description: 'Introduce store layout, products, and team', estimatedMins: 30, required: true },
      { order: 2, title: 'Safety and emergency procedures', description: 'Fire exits, first aid, emergency contacts', estimatedMins: 15, required: true },
      { order: 3, title: 'POS system training', description: 'How to use billing and inventory system', estimatedMins: 30, required: true },
      { order: 4, title: 'Customer service guidelines', description: 'How to greet, assist, and handle complaints', estimatedMins: 20, required: true },
      { order: 5, title: 'Shelf management training', description: 'How to restock, organize, and check expiry', estimatedMins: 20, required: true },
      { order: 6, title: 'Assign login and permissions', description: 'Create system access with appropriate role', estimatedMins: 10, required: true },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// VENDOR MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════

export const VENDOR_MESSAGE_TEMPLATES = {
  po_send: (params: { supplierName: string; poNumber: string; itemCount: number; totalAmount: number; deliveryDate: string; storeName: string }) =>
    `Namaste ${params.supplierName}.\n\nOrder #${params.poNumber} for ${params.itemCount} items, total ₹${params.totalAmount.toLocaleString('en-IN')}.\n\nPlease confirm availability and delivery by ${params.deliveryDate}.\n\n— ${params.storeName}`,

  follow_up: (params: { supplierName: string; poNumber: string; sentDate: string; storeName: string }) =>
    `Namaste ${params.supplierName}.\n\nReminder about Order #${params.poNumber} sent on ${params.sentDate}. Kindly confirm availability and delivery date.\n\n— ${params.storeName}`,

  delivery_confirm: (params: { supplierName: string; poNumber: string; deliveryDate: string; storeName: string }) =>
    `Namaste ${params.supplierName}.\n\nPlease confirm delivery of Order #${params.poNumber} on ${params.deliveryDate}.\n\n— ${params.storeName}`,

  negotiation: (params: { supplierName: string; productNames: string; currentPrice: number; targetPrice: number; storeName: string }) =>
    `Namaste ${params.supplierName}.\n\nWe are looking for a better rate on ${params.productNames}. Current rate ₹${params.currentPrice}. Can you offer ₹${params.targetPrice}? We have consistent monthly orders.\n\n— ${params.storeName}`,

  reminder: (params: { supplierName: string; poNumber: string; dueDate: string; storeName: string }) =>
    `Namaste ${params.supplierName}.\n\nOrder #${params.poNumber} is due on ${params.dueDate}. Please ensure timely delivery.\n\n— ${params.storeName}`,
};

// ═══════════════════════════════════════════════════════════════
// HEALTH SCORE WEIGHTS
// ═══════════════════════════════════════════════════════════════

export const HEALTH_DIMENSION_WEIGHTS: Record<string, number> = {
  inventory: 0.15,
  cash: 0.12,
  profit: 0.15,
  expiry: 0.10,
  forecastAccuracy: 0.12,
  supplierHealth: 0.10,
  recommendationAdoption: 0.08,
  employeePerformance: 0.08,
  salesTrend: 0.10,
};

// ═══════════════════════════════════════════════════════════════
// SUPPLIER RANKING WEIGHTS
// ═══════════════════════════════════════════════════════════════

export const SUPPLIER_RANKING_WEIGHTS: Record<string, number> = {
  price: 0.20,
  reliability: 0.20,
  leadTime: 0.15,
  defectRate: 0.15,
  availability: 0.10,
  creditPeriod: 0.10,
  historical: 0.10,
};

// ═══════════════════════════════════════════════════════════════
// LOYALTY SEGMENT THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const LOYALTY_THRESHOLDS = {
  vip: { minSpendPercentile: 90, minVisitsPerWeek: 2 },
  frequent: { minVisitsPerWeek: 1 },
  seasonal: { varianceThreshold: 0.5 },
  inactive: { daysSinceLastVisit: 30 },
  lost: { daysSinceLastVisit: 90 },
};

// ═══════════════════════════════════════════════════════════════
// GST RATES (India)
// ═══════════════════════════════════════════════════════════════

export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export const GST_FILING_DEADLINES = {
  gstr1: { dueDay: 11, description: 'GSTR-1 due by 11th of next month' },
  gstr3b: { dueDay: 20, description: 'GSTR-3B due by 20th of next month' },
};

// ═══════════════════════════════════════════════════════════════
// NAVIGATION ITEMS (for hub page cards)
// ═══════════════════════════════════════════════════════════════

export interface StoreAssistantNavItem {
  title: string;
  description: string;
  href: string;
  icon: string;
  group: 'core' | 'intelligence' | 'communication' | 'strategy';
  badge?: string;
}

export const STORE_ASSISTANT_NAV: StoreAssistantNavItem[] = [
  // Core Operations
  { title: 'Daily Brief', description: 'Morning & closing business reports', href: '/dashboard/store-assistant/daily-brief', icon: 'Sunrise', group: 'core', badge: 'AI' },
  { title: 'Purchase Automation', description: 'Auto-generated purchase orders', href: '/dashboard/store-assistant/purchase-automation', icon: 'ShoppingCart', group: 'core', badge: 'AI' },
  { title: 'Smart Khata', description: 'Digital credit book & reminders', href: '/dashboard/store-assistant/khata', icon: 'BookOpen', group: 'core' },
  { title: 'Employee Tasks', description: 'Auto-assigned daily task manager', href: '/dashboard/store-assistant/employee-tasks', icon: 'ListChecks', group: 'core' },
  { title: 'Shelf Management', description: 'Shelf zones & refill routing', href: '/dashboard/store-assistant/shelf-management', icon: 'LayoutGrid', group: 'core' },
  { title: 'Expiry Assistant', description: 'Expiry alerts & action plans', href: '/dashboard/store-assistant/expiry', icon: 'Timer', group: 'core' },
  { title: 'Dead Inventory', description: 'Non-selling product detection', href: '/dashboard/store-assistant/dead-inventory', icon: 'PackageX', group: 'core' },
  { title: 'SOPs', description: 'Standard operating procedures', href: '/dashboard/store-assistant/sop', icon: 'ClipboardCheck', group: 'core' },

  // Intelligence & Optimization
  { title: 'Business Coach', description: 'AI-powered daily business advice', href: '/dashboard/store-assistant/business-coach', icon: 'Brain', group: 'intelligence', badge: 'AI' },
  { title: 'Price Optimizer', description: 'Dynamic AI pricing engine', href: '/dashboard/store-assistant/pricing', icon: 'TrendingUp', group: 'intelligence', badge: 'AI' },
  { title: 'Demand Scenarios', description: 'What-if demand simulations', href: '/dashboard/store-assistant/demand-scenarios', icon: 'FlaskConical', group: 'intelligence' },
  { title: 'Store Health', description: 'Composite health score dashboard', href: '/dashboard/store-assistant/store-health', icon: 'HeartPulse', group: 'intelligence' },
  { title: 'Layout Optimizer', description: 'AI store layout suggestions', href: '/dashboard/store-assistant/layout-optimizer', icon: 'LayoutDashboard', group: 'intelligence', badge: 'AI' },
  { title: 'Loss Prevention', description: 'Theft, fraud & shrinkage detection', href: '/dashboard/store-assistant/loss-prevention', icon: 'ShieldAlert', group: 'intelligence' },
  { title: 'Cash Intelligence', description: 'Cash flow predictions & analysis', href: '/dashboard/store-assistant/cash', icon: 'Wallet', group: 'intelligence' },
  { title: 'Benchmarking', description: 'Store performance comparisons', href: '/dashboard/store-assistant/benchmarking', icon: 'BarChart3', group: 'intelligence' },

  // Communication & Compliance
  { title: 'Vendor Comms', description: 'Automated supplier messaging', href: '/dashboard/store-assistant/vendor-comms', icon: 'MessageSquare', group: 'communication', badge: 'Auto' },
  { title: 'Customer Comms', description: 'Automated customer messaging', href: '/dashboard/store-assistant/customer-comms', icon: 'Send', group: 'communication', badge: 'Auto' },
  { title: 'GST & Compliance', description: 'Auto tax computation & filing', href: '/dashboard/store-assistant/compliance', icon: 'FileSpreadsheet', group: 'communication' },
  { title: 'Customer Loyalty', description: 'Segments, rewards & campaigns', href: '/dashboard/store-assistant/customer-loyalty', icon: 'Heart', group: 'communication' },
  { title: 'Supplier Assistant', description: 'Supplier ranking & negotiation', href: '/dashboard/store-assistant/supplier-assistant', icon: 'Users', group: 'communication' },
  { title: 'Delivery Planning', description: 'Route optimization & tracking', href: '/dashboard/store-assistant/delivery', icon: 'Truck', group: 'communication' },

  // Strategy & Growth
  { title: 'Festival Planner', description: 'Auto festival demand preparation', href: '/dashboard/store-assistant/festival-planner', icon: 'PartyPopper', group: 'strategy' },
  { title: 'Goal Tracker', description: 'Set goals with AI coaching', href: '/dashboard/store-assistant/goals', icon: 'Target', group: 'strategy' },
  { title: 'Expense Monitor', description: 'Track & optimize expenses', href: '/dashboard/store-assistant/expenses', icon: 'Receipt', group: 'strategy' },
  { title: 'Negotiation AI', description: 'Supplier negotiation insights', href: '/dashboard/store-assistant/negotiation', icon: 'Handshake', group: 'strategy', badge: 'AI' },
  { title: 'Autonomous Mode', description: 'Full auto-pilot store operations', href: '/dashboard/store-assistant/autonomous', icon: 'Cpu', group: 'strategy', badge: '⚡' },
];
