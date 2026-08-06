/* eslint-disable @typescript-eslint/no-explicit-any */
/** SOPService — Standard Operating Procedure Management */
import { createClient } from '@supabase/supabase-js';
import type { SOPTemplateRow, SOPExecutionRow } from './types';
import { DEFAULT_SOPS } from './constants';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class SOPService {
  async initializeDefaults(storeId: string): Promise<number> {
    const { data: existing } = await supabase.from('sop_templates').select('id').eq('store_id', storeId).limit(1);
    if (existing && existing.length > 0) return 0;
    const templates = DEFAULT_SOPS.map(sop => ({
      store_id: storeId, name: sop.name, category: sop.category, steps: sop.steps,
      estimated_total_mins: sop.steps.reduce((s, step) => s + step.estimatedMins, 0), auto_generated: true,
    }));
    const { data } = await supabase.from('sop_templates').insert(templates).select();
    return data?.length || 0;
  }

  async getTemplates(storeId: string): Promise<SOPTemplateRow[]> {
    const { data } = await supabase.from('sop_templates').select('*').eq('store_id', storeId).eq('is_active', true).order('name');
    return (data || []) as SOPTemplateRow[];
  }

  async startExecution(storeId: string, templateId: string, executorName: string): Promise<SOPExecutionRow | null> {
    const { data: template } = await supabase.from('sop_templates').select('steps').eq('id', templateId).single();
    if (!template) return null;
    const stepResults = (template.steps as any[]).map((s: any) => ({ stepOrder: s.order, status: 'pending', completedAt: null, notes: null }));
    const { data, error } = await supabase.from('sop_executions').insert({
      template_id: templateId, store_id: storeId, executor_name: executorName, step_results: stepResults,
    }).select().single();
    if (error) return null;
    return data as SOPExecutionRow;
  }

  async completeStep(executionId: string, stepOrder: number, notes?: string): Promise<void> {
    const { data: exec } = await supabase.from('sop_executions').select('step_results').eq('id', executionId).single();
    if (!exec) return;
    const results = (exec.step_results as any[]).map((r: any) => {
      if (r.stepOrder === stepOrder) return { ...r, status: 'done', completedAt: new Date().toISOString(), notes: notes || null };
      return r;
    });
    const completed = results.filter((r: any) => r.status === 'done').length;
    const pct = Math.round((completed / results.length) * 100);
    const status = pct >= 100 ? 'completed' : 'in_progress';
    await supabase.from('sop_executions').update({
      step_results: results, completion_pct: pct, status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', executionId);
  }

  async getExecutions(storeId: string, limit = 20): Promise<SOPExecutionRow[]> {
    const { data } = await supabase.from('sop_executions').select('*, sop_templates(name)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(limit);
    return (data || []) as SOPExecutionRow[];
  }
}
export const sopService = new SOPService();
