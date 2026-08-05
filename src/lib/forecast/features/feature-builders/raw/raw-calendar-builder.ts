/**
 * Raw Calendar Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawCalendarFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawCalendarFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const target = new Date(context.targetDate || new Date().toISOString());
    const cal = context.rawInput.calendar || {
      date: target.toISOString().split('T')[0],
      dayOfWeek: target.getDay(),
      weekNumber: this.getWeekNumber(target),
      month: target.getMonth() + 1,
      quarter: Math.floor(target.getMonth() / 3) + 1,
      isWeekend: target.getDay() === 0 || target.getDay() === 6,
      isHoliday: false,
      isFestival: false,
      financialYear: `FY${target.getFullYear()}`,
      season: this.getSeason(target.getMonth() + 1),
    };

    const features = {
      raw_day_of_week: cal.dayOfWeek,
      raw_week_number: cal.weekNumber,
      raw_month: cal.month,
      raw_quarter: cal.quarter,
      raw_is_weekend: cal.isWeekend ? 1 : 0,
      raw_is_holiday: cal.isHoliday ? 1 : 0,
      raw_is_festival: cal.isFestival ? 1 : 0,
      raw_financial_year: cal.financialYear,
      raw_season: cal.season,
    };

    const lineage = {
      raw_day_of_week: FeatureLineageTracker.createLineage('raw_day_of_week', 'calendar', 'day_of_week', this.name, this.version),
      raw_month: FeatureLineageTracker.createLineage('raw_month', 'calendar', 'month', this.name, this.version),
    };

    return { features, lineage };
  }

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Autumn';
    return 'Winter';
  }
}
