/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FestivalService — Festival Detection, Demand Prediction & Auto-Preparation
 */

import { createClient } from '@supabase/supabase-js';
import type { FestivalPlanRow } from './types';
import { FESTIVALS } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface UpcomingFestival {
  name: string;
  date: string;
  daysAway: number;
  leadDays: number;
  needsPreparation: boolean;
  demandMultiplier: number;
  highDemandCategories: string[];
  existingPlan: FestivalPlanRow | null;
}

export class FestivalService {

  /** Get upcoming festivals within next 60 days */
  async getUpcoming(storeId: string, withinDays = 60): Promise<UpcomingFestival[]> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const upcoming: UpcomingFestival[] = [];

    for (const fest of FESTIVALS) {
      // Check this year and next year
      for (const year of [currentYear, currentYear + 1]) {
        const festDate = new Date(year, fest.approxMonth - 1, fest.approxDay);
        const daysAway = Math.ceil((festDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysAway > 0 && daysAway <= withinDays) {
          // Check for existing plan
          const { data: existingPlan } = await supabase
            .from('festival_plans')
            .select('*')
            .eq('store_id', storeId)
            .eq('festival_name', fest.name)
            .gte('festival_date', today.toISOString().split('T')[0])
            .maybeSingle();

          upcoming.push({
            name: fest.name,
            date: festDate.toISOString().split('T')[0],
            daysAway,
            leadDays: fest.leadDays,
            needsPreparation: daysAway <= fest.leadDays && !existingPlan,
            demandMultiplier: fest.demandMultiplier,
            highDemandCategories: fest.highDemandCategories,
            existingPlan: existingPlan as FestivalPlanRow | null,
          });
        }
      }
    }

    return upcoming.sort((a, b) => a.daysAway - b.daysAway);
  }

  /** Generate a festival preparation plan */
  async generatePlan(storeId: string, festivalName: string, festivalDate: string): Promise<FestivalPlanRow | null> {
    const fest = FESTIVALS.find(f => f.name === festivalName);
    if (!fest) return null;

    // Get current inventory for high-demand categories
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock, price')
      .eq('store_id', storeId)
      .in('category', fest.highDemandCategories);

    // Build demand forecast
    const demandForecast: Record<string, number> = {};
    for (const cat of fest.highDemandCategories) {
      demandForecast[cat] = fest.demandMultiplier;
    }

    // Build promotion plan
    const promotionPlan: Record<string, any> = {
      promotionTypes: fest.promotionTypes,
      suggestedDiscounts: fest.promotionTypes.includes('discount') ? '10-20%' : null,
      suggestedBundles: fest.promotionTypes.includes('bundle') ? 'Festival combo packs' : null,
    };

    const { data: plan, error } = await supabase
      .from('festival_plans')
      .insert({
        store_id: storeId,
        festival_name: festivalName,
        festival_date: festivalDate,
        lead_time_days: fest.leadDays,
        demand_forecast: demandForecast,
        promotion_plan: promotionPlan,
        staff_requirements: { extraStaff: fest.demandMultiplier > 2 ? 2 : 1, extendedHours: fest.demandMultiplier > 2 },
        auto_generated: true,
      })
      .select()
      .single();

    if (error) return null;
    return plan as FestivalPlanRow;
  }

  /** Get all plans for a store */
  async getPlans(storeId: string): Promise<FestivalPlanRow[]> {
    const { data } = await supabase
      .from('festival_plans')
      .select('*')
      .eq('store_id', storeId)
      .order('festival_date', { ascending: true });

    return (data || []) as FestivalPlanRow[];
  }

  /** Update plan status */
  async updatePlanStatus(planId: string, status: FestivalPlanRow['status']): Promise<void> {
    await supabase.from('festival_plans').update({ status }).eq('id', planId);
  }
}

export const festivalService = new FestivalService();
