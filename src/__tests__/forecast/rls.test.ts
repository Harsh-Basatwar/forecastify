import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('RLS Policies SQL Validation', () => {
  test('migration should enable RLS and create isolation policies on all infrastructure tables', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260806030000_forecast_engine_2.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    assert.equal(sql.includes('ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;'), true);
    assert.equal(sql.includes('ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;'), true);
    assert.equal(sql.includes('ALTER TABLE public.forecast_settings ENABLE ROW LEVEL SECURITY;'), true);

    assert.equal(sql.includes('CREATE POLICY "Users can view own store forecast models"'), true);
    assert.equal(sql.includes('CREATE POLICY "Users can view own store forecast jobs"'), true);
    assert.equal(sql.includes('CREATE POLICY "Users can view own store forecast settings"'), true);
  });
});
