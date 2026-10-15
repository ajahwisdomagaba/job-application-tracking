import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import JobPost from '../src/models/JobPost.js';

const baseJob = () => ({
  recruiter: new mongoose.Types.ObjectId(),
  title: 'Junior Frontend Developer',
  companyName: 'Northstar Digital',
  field: 'Software Development',
  description: 'Build accessible web interfaces.',
  location: 'Lagos, Nigeria (Hybrid)',
  salaryMin: 180000,
  salaryMax: 300000,
  salaryPeriod: 'per month',
  closingDate: new Date('2026-12-31T23:59:59.999Z'),
});

test('a job post requires at least one requirement', () => {
  const empty = new JobPost({ ...baseJob(), requirements: [] });
  const missing = new JobPost(baseJob());
  const blank = new JobPost({ ...baseJob(), requirements: ['   '] });
  const present = new JobPost({
    ...baseJob(),
    requirements: [' JavaScript fundamentals '],
  });

  assert.ok(empty.validateSync().errors.requirements);
  assert.ok(missing.validateSync().errors.requirements);
  assert.ok(blank.validateSync().errors.requirements);
  assert.equal(present.validateSync(), undefined);
  assert.deepEqual(present.requirements, ['JavaScript fundamentals']);
});
