/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TaskService — Employee Task Orchestration
 *
 * Auto-generates daily tasks from expiry, shelf refill, and inventory signals.
 * Manages task lifecycle: pending → in_progress → completed.
 */

import { createClient } from '@supabase/supabase-js';
import type { EmployeeTaskRow, TaskPriority, TaskStatus, TaskType } from './types';
import { TASK_TYPES } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export class TaskService {

  /** Generate daily tasks based on store conditions */
  async generateDailyTasks(storeId: string): Promise<EmployeeTaskRow[]> {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    // Check if tasks already generated today
    const { data: existingTasks } = await supabase
      .from('employee_tasks')
      .select('id')
      .eq('store_id', storeId)
      .eq('auto_generated', true)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .limit(1);

    if (existingTasks && existingTasks.length > 0) {
      // Return today's tasks
      return this.getTasks(storeId, { dateRange: 'today' });
    }

    const tasks: Partial<EmployeeTaskRow>[] = [];

    // 1. Expiry check tasks
    const { data: expiringItems } = await supabase
      .from('inventory')
      .select('id, product_name, category, expiry_date, current_stock:quantity')
      .eq('store_id', storeId)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('current_stock', 0);

    if (expiringItems && expiringItems.length > 0) {
      tasks.push({
        store_id: storeId,
        task_type: 'expiry_check',
        title: `Check ${expiringItems.length} items expiring within 7 days`,
        description: `Products: ${expiringItems.slice(0, 5).map((i: any) => i.product_name).join(', ')}${expiringItems.length > 5 ? ` +${expiringItems.length - 5} more` : ''}`,
        priority: 'high',
        status: 'pending',
        due_at: `${today}T12:00:00`,
        product_ids: expiringItems.map((i: any) => i.id),
        auto_generated: true,
      });
    }

    // 2. Low stock refill tasks
    const { data: lowStockItems } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock:quantity')
      .eq('store_id', storeId)
      .lte('current_stock', 5)
      .gt('current_stock', 0);

    if (lowStockItems && lowStockItems.length > 0) {
      tasks.push({
        store_id: storeId,
        task_type: 'shelf_refill',
        title: `Refill ${lowStockItems.length} low-stock items on shelves`,
        description: `Products: ${lowStockItems.slice(0, 5).map((i: any) => i.product_name).join(', ')}${lowStockItems.length > 5 ? ` +${lowStockItems.length - 5} more` : ''}`,
        priority: 'medium',
        status: 'pending',
        due_at: `${today}T10:00:00`,
        product_ids: lowStockItems.map((i: any) => i.id),
        auto_generated: true,
      });
    }

    // 3. Inventory count task (daily)
    tasks.push({
      store_id: storeId,
      task_type: 'inventory_count',
      title: 'Daily inventory spot check',
      description: 'Verify stock count for top 10 fast-moving items',
      priority: 'medium',
      status: 'pending',
      due_at: `${today}T14:00:00`,
      auto_generated: true,
    });

    // 4. Cleaning task
    tasks.push({
      store_id: storeId,
      task_type: 'cleaning',
      title: 'Store cleaning and organization',
      description: 'Clean counters, organize shelves, mop floors',
      priority: 'low',
      status: 'pending',
      due_at: `${today}T08:00:00`,
      auto_generated: true,
    });

    // Insert all tasks
    if (tasks.length === 0) return [];

    const { data: created, error } = await supabase
      .from('employee_tasks')
      .insert(tasks)
      .select();

    if (error) { console.error('Task generation failed:', error); return []; }
    return (created || []) as EmployeeTaskRow[];
  }

  /** Get tasks with optional filters */
  async getTasks(storeId: string, filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    taskType?: TaskType;
    dateRange?: 'today' | 'week' | 'all';
  }): Promise<EmployeeTaskRow[]> {
    let query = supabase
      .from('employee_tasks')
      .select('*')
      .eq('store_id', storeId)
      .order('priority', { ascending: true })
      .order('due_at', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.assignee) query = query.eq('assignee', filters.assignee);
    if (filters?.taskType) query = query.eq('task_type', filters.taskType);

    if (filters?.dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`);
    } else if (filters?.dateRange === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', weekAgo);
    }

    const { data } = await query.limit(100);
    return (data || []) as EmployeeTaskRow[];
  }

  /** Create a manual task */
  async createTask(storeId: string, task: {
    taskType: TaskType;
    title: string;
    description?: string;
    assignee?: string;
    priority?: TaskPriority;
    dueAt?: string;
    zoneCode?: string;
  }): Promise<EmployeeTaskRow | null> {
    const { data, error } = await supabase
      .from('employee_tasks')
      .insert({
        store_id: storeId,
        task_type: task.taskType,
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        priority: task.priority || 'medium',
        due_at: task.dueAt,
        zone_code: task.zoneCode,
        auto_generated: false,
      })
      .select()
      .single();

    if (error) return null;
    return data as EmployeeTaskRow;
  }

  /** Update task status */
  async updateStatus(taskId: string, status: TaskStatus): Promise<EmployeeTaskRow | null> {
    const updates: Record<string, any> = { status };

    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('employee_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) return null;
    return data as EmployeeTaskRow;
  }

  /** Assign task to employee */
  async assignTask(taskId: string, assignee: string): Promise<void> {
    await supabase
      .from('employee_tasks')
      .update({ assignee })
      .eq('id', taskId);
  }

  /** Get task summary stats */
  async getTaskSummary(storeId: string): Promise<{
    total: number; pending: number; inProgress: number; completed: number; skipped: number;
    completionRate: number; avgCompletionMins: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('employee_tasks')
      .select('status, created_at, completed_at')
      .eq('store_id', storeId)
      .gte('created_at', `${today}T00:00:00`);

    const tasks = data || [];
    const pending = tasks.filter((t: any) => t.status === 'pending').length;
    const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const skipped = tasks.filter((t: any) => t.status === 'skipped').length;

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      skipped,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      avgCompletionMins: 0,
    };
  }

  /** Get daily and weekly productivity metrics for employees */
  async getProductivityStats(storeId: string): Promise<{
    todayCompleted: number;
    weeklyCompleted: number;
    completionPctToday: number;
    topEmployees: { name: string; completedCount: number }[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: weekTasks } = await supabase
      .from('employee_tasks')
      .select('assignee, status, created_at, completed_at')
      .eq('store_id', storeId)
      .gte('created_at', weekAgo);

    const tasks = weekTasks || [];
    const todayTasks = tasks.filter(t => new Date(t.created_at).toISOString().startsWith(today));
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
    const weeklyCompleted = tasks.filter(t => t.status === 'completed').length;

    // Tally by assignee
    const employeeMap = new Map<string, number>();
    for (const t of tasks.filter(t => t.status === 'completed' && t.assignee)) {
      const name = t.assignee || 'Unassigned';
      employeeMap.set(name, (employeeMap.get(name) || 0) + 1);
    }

    const topEmployees = Array.from(employeeMap.entries())
      .map(([name, completedCount]) => ({ name, completedCount }))
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 5);

    return {
      todayCompleted,
      weeklyCompleted,
      completionPctToday: todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 100,
      topEmployees,
    };
  }

  /** Get task type metadata */
  getTaskTypeMeta(type: string) {
    return TASK_TYPES.find(t => t.type === type) || TASK_TYPES[TASK_TYPES.length - 1];
  }
}

export const taskService = new TaskService();

