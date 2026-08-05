/**
 * Forecast Job Scheduler (Infrastructure Job Scheduler for Forecast Engine 2.0)
 */

import { IForecastJobScheduler, IForecastRepository } from './interfaces';
import { ForecastJob, ForecastJobType } from './types';
import { SchedulerError } from './errors';

type JobHandler = (job: ForecastJob) => Promise<void>;

export class ForecastJobScheduler implements IForecastJobScheduler {
  private handlers: Map<ForecastJobType, JobHandler> = new Map();

  constructor(private readonly repository: IForecastRepository) {}

  public async scheduleJob(
    storeId: string,
    jobType: ForecastJobType,
    parameters: Record<string, unknown> = {}
  ): Promise<ForecastJob> {
    try {
      const job = await this.repository.saveJob({
        storeId,
        jobType,
        status: 'Queued',
        parameters,
        attempts: 0,
        maxAttempts: 3,
        isDeleted: false,
      });

      return job;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SchedulerError(`Failed to schedule job ${jobType} for store ${storeId}: ${message}`);
    }
  }

  public async cancelJob(jobId: string, storeId: string): Promise<boolean> {
    try {
      const job = await this.repository.getJob(jobId, storeId);
      if (!job) return false;

      if (job.status === 'Completed' || job.status === 'Cancelled') {
        return false;
      }

      await this.repository.updateJob(jobId, storeId, { status: 'Cancelled' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SchedulerError(`Failed to cancel job ${jobId}: ${message}`);
    }
  }

  public async retryJob(jobId: string, storeId: string): Promise<ForecastJob> {
    try {
      const job = await this.repository.getJob(jobId, storeId);
      if (!job) {
        throw new SchedulerError(`Job ${jobId} not found`);
      }

      const updated = await this.repository.updateJob(jobId, storeId, {
        status: 'Queued',
        attempts: job.attempts + 1,
        errorMessage: undefined,
      });

      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SchedulerError(`Failed to retry job ${jobId}: ${message}`);
    }
  }

  public async getJobStatus(jobId: string, storeId: string): Promise<ForecastJob | null> {
    return this.repository.getJob(jobId, storeId);
  }

  public registerJobHandler(jobType: ForecastJobType, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }
}
