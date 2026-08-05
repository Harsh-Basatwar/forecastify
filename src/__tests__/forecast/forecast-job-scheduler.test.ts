import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ForecastJobScheduler } from '../../lib/forecast/forecast-job-scheduler';
import { IForecastRepository } from '../../lib/forecast/interfaces';
import { ForecastJob } from '../../lib/forecast/types';

class MockForecastRepository implements Partial<IForecastRepository> {
  private jobs: Map<string, ForecastJob> = new Map();

  async saveJob(job: Omit<ForecastJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastJob> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const createdJob: ForecastJob = {
      ...job,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, createdJob);
    return createdJob;
  }

  async getJob(jobId: string, storeId: string): Promise<ForecastJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.storeId !== storeId) return null;
    return job;
  }

  async updateJob(jobId: string, storeId: string, updates: Partial<ForecastJob>): Promise<ForecastJob> {
    const job = await this.getJob(jobId, storeId);
    if (!job) throw new Error('Job not found');
    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(jobId, updated);
    return updated;
  }
}

describe('ForecastJobScheduler - Unit Tests', () => {
  test('should schedule a background job', async () => {
    const repo = (new MockForecastRepository() as unknown) as IForecastRepository;
    const scheduler = new ForecastJobScheduler(repo);

    const storeId = 'store-uuid-123';
    const job = await scheduler.scheduleJob(storeId, 'GENERATE_FORECAST', { horizon: '7d' });

    assert.equal(job.storeId, storeId);
    assert.equal(job.jobType, 'GENERATE_FORECAST');
    assert.equal(job.status, 'Queued');
  });

  test('should cancel a queued job', async () => {
    const repo = (new MockForecastRepository() as unknown) as IForecastRepository;
    const scheduler = new ForecastJobScheduler(repo);

    const storeId = 'store-uuid-123';
    const job = await scheduler.scheduleJob(storeId, 'TRAIN_MODEL');
    const cancelled = await scheduler.cancelJob(job.id, storeId);

    assert.equal(cancelled, true);

    const updatedJob = await scheduler.getJobStatus(job.id, storeId);
    assert.equal(updatedJob?.status, 'Cancelled');
  });
});
