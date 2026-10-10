import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import Interview from '../src/models/Interview.js';

test('application model has no embedded interview array', () => {
  assert.equal(Application.schema.path('interviews'), undefined);
  assert.ok(Application.schema.path('currentStage'));
  assert.ok(Application.schema.path('recruiter'));
  assert.ok(Application.schema.path('deadline'));
});

test('interview model uses the requested defaults and references', async () => {
  const interview = new Interview({
    application: new mongoose.Types.ObjectId(),
    dateTime: new Date('2026-11-03T15:00:00Z'),
    type: 'video',
    locationOrLink: 'https://meet.example.com/room',
    setBy: new mongoose.Types.ObjectId(),
  });

  assert.equal(interview.roundNumber, 1);
  assert.equal(interview.timeZone, 'Africa/Lagos');
  assert.equal(interview.status, 'Scheduled');
  assert.equal(Interview.schema.path('application').options.ref, 'Application');
  assert.equal(Interview.schema.path('setBy').options.ref, 'User');
  await assert.doesNotReject(interview.validate());
});

test('interview model rejects invalid type and status values', async () => {
  const interview = new Interview({
    application: new mongoose.Types.ObjectId(),
    dateTime: new Date(),
    timeZone: 'Africa/Lagos',
    type: 'onsite',
    locationOrLink: 'Example office',
    setBy: new mongoose.Types.ObjectId(),
    status: 'Pending',
  });

  await assert.rejects(interview.validate(), (error) => {
    assert.ok(error.errors.type);
    assert.ok(error.errors.status);
    return true;
  });
});

test('an application cannot have duplicate interview rounds', () => {
  const roundIndex = Interview.schema.indexes().find(
    ([keys]) => keys.application === 1 && keys.roundNumber === 1
  );

  assert.ok(roundIndex);
  assert.equal(roundIndex[1].unique, true);
});
