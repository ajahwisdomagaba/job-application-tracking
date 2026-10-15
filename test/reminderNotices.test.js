import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import { describeDueReminder } from '../src/services/cron.service.js';
import { onStageChanged } from '../src/services/pipelineHooks.js';

test('deadline reminders use the application deadline field', async () => {
  const deadline = new Date('2026-12-01T00:00:00.000Z');
  const findById = Application.findById;
  Application.findById = async () => ({
    deadline,
    jobTitle: 'Backend Developer Intern',
    companyName: 'Northstar Digital',
  });

  try {
    const dispatch = await describeDueReminder({
      source: 'deadline',
      application: new mongoose.Types.ObjectId(),
    });
    assert.equal(dispatch.deactivate, false);
    assert.equal(dispatch.targetDateTime, deadline);
    assert.match(dispatch.message, /Northstar Digital/);
  } finally {
    Application.findById = findById;
  }
});

test('a deadline reminder without a deadline is deactivated', async () => {
  const findById = Application.findById;
  Application.findById = async () => ({ jobTitle: 'Role', companyName: 'Co' });

  try {
    const dispatch = await describeDueReminder({
      source: 'deadline',
      application: new mongoose.Types.ObjectId(),
    });
    assert.equal(dispatch.deactivate, true);
  } finally {
    Application.findById = findById;
  }
});

test('stage changes notify the job seeker in the app', async () => {
  const owner = new mongoose.Types.ObjectId();
  const applicationId = new mongoose.Types.ObjectId();
  const created = [];
  const create = Notification.create;
  const findById = User.findById;
  Notification.create = async (doc) => {
    created.push(doc);
    return doc;
  };
  User.findById = () => ({
    select: async () => ({ email: 'seeker@example.com', name: 'Ada' }),
  });

  const application = {
    _id: applicationId,
    owner,
    jobTitle: 'IT Support Officer',
    companyName: 'Greenfield Technologies',
  };

  try {
    await onStageChanged({
      application,
      oldStage: 'Applied',
      newStage: 'Interview',
      interview: {
        roundNumber: 1,
        dateTime: '2026-11-03T15:00:00Z',
        timeZone: 'Africa/Lagos',
        type: 'video',
        locationOrLink: 'https://meet.example.com/room',
      },
    });
    await onStageChanged({
      application,
      oldStage: 'Interview',
      newStage: 'Rejected',
      interview: null,
    });
  } finally {
    Notification.create = create;
    User.findById = findById;
  }

  assert.equal(created[0].type, 'interview_set');
  assert.equal(created[0].recipient, owner);
  assert.match(created[0].message, /round 1/);
  assert.match(created[0].message, /https:\/\/meet.example.com\/room/);
  assert.equal(created[1].type, 'stage_changed');
  assert.match(created[1].message, /Rejected/);
});
