/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WorkflowStateEngine — Manages Long-Running Multi-Step Conversation State Machines
 */

import { createClient } from '@supabase/supabase-js';
import type { WorkflowStateRow, WorkflowStateStep } from './types';
import { communicationEventBus } from './communication-event-bus';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class WorkflowStateEngine {
  /** Get or initialize a workflow state for an entity */
  async getOrInitWorkflow(
    storeId: string,
    threadId: string,
    workflowType: WorkflowStateRow['workflow_type'],
    entityType: WorkflowStateRow['entity_type'],
    entityId: string,
    initialState: WorkflowStateStep = 'INITIATED'
  ): Promise<WorkflowStateRow | null> {
    try {
      const { data: existing } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('workflow_type', workflowType)
        .limit(1)
        .maybeSingle();

      if (existing) return existing as WorkflowStateRow;

      const now = new Date().toISOString();
      const { data: created, error } = await supabase
        .from('workflow_states')
        .insert({
          store_id: storeId,
          thread_id: threadId,
          workflow_type: workflowType,
          entity_type: entityType,
          entity_id: entityId,
          current_state: initialState,
          state_data: {},
          history: [{ state: initialState, timestamp: now, note: 'Workflow initialized' }],
          is_completed: false,
        })
        .select()
        .single();

      if (error) return null;
      return created as WorkflowStateRow;
    } catch (err) {
      console.error('[WorkflowStateEngine] getOrInitWorkflow error:', err);
      return null;
    }
  }

  /** Transition workflow state */
  async transitionState(
    workflowId: string,
    nextState: WorkflowStateStep,
    additionalData?: Record<string, any>,
    note?: string
  ): Promise<WorkflowStateRow | null> {
    try {
      const { data: current } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (!current) return null;

      const now = new Date().toISOString();
      const updatedHistory = [...(current.history || []), { state: nextState, timestamp: now, note: note || `State transitioned to ${nextState}` }];
      const isCompleted = ['ORDER_CONFIRMED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'PAID'].includes(nextState);

      const { data: updated, error } = await supabase
        .from('workflow_states')
        .update({
          current_state: nextState,
          state_data: { ...(current.state_data || {}), ...(additionalData || {}) },
          history: updatedHistory,
          is_completed: isCompleted,
          updated_at: now,
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) return null;

      await communicationEventBus.publish({
        eventType: 'workflow.state_changed',
        source: 'WorkflowStateEngine',
        payload: { workflowId, previousState: current.current_state, nextState, entityId: current.entity_id },
      });

      return updated as WorkflowStateRow;
    } catch (err) {
      console.error('[WorkflowStateEngine] transitionState error:', err);
      return null;
    }
  }
}

export const workflowStateEngine = new WorkflowStateEngine();
