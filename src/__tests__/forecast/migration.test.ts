import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Database Migration SQL File Validation', () => {
  test('migration 20260806030000_forecast_engine_2.sql should exist and contain table creation SQL', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260806030000_forecast_engine_2.sql'
    );
    assert.equal(fs.existsSync(migrationPath), true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.equal(sql.includes('CREATE TABLE IF NOT EXISTS public.forecast_models'), true);
    assert.equal(sql.includes('CREATE TABLE IF NOT EXISTS public.forecast_jobs'), true);
    assert.equal(sql.includes('CREATE TABLE IF NOT EXISTS public.forecast_settings'), true);
  });
});
