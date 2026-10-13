import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import Interview from '../src/models/Interview.js';
import {
  getJobseekerApplication,
  scheduleInterview,
  updateApplicationDeadline,
  updateInterview,
} from '../src/controllers/application.controller.js';

const makeApplication = () => {
  const application = new Application({
    jobSeekerId: new mongoose.Types.ObjectId(),
    recruiter: new mongoose.Types.ObjectId(),
    jobTitle: 'Software Engineer',
    companyName: 'Example Co.',
  });
  application.save = async () => application;
  return application;
};

const makeInterview = (application) => {
  const interview = new Interview({
    application: application._id,
    roundNumber: 2,
    dateTime: '2026-11-03T15:00:00Z',
    timeZone: 'Europe/London',
    type: 'video',
    locationOrLink: 'https://meet.example.com/room',
    setBy: application.recruiter,
  });
  interview.save = async () => interview;
  return interview;
};

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('recruiter can schedule round 2 with the required interview fields', async () => {
  const application = makeApplication();
  const findOne = Application.findOne;
  const exists = Interview.exists;
  const create = Interview.create;
  Application.findOne = async (query) => {
    assert.ok(query.recruiter.equals(application.recruiter));
    return application;
  };
  Interview.exists = async () => false;
  Interview.create = async (data) => new Interview(data);

  try {
    const res = makeResponse();
    await scheduleInterview(
      {
        body: {
          roundNumber: 2,
          dateTime: '2026-11-03T15:00:00Z',
          type: 'video',
          locationOrLink: 'https://meet.example.com/room',
        },
        params: { applicationId: application.id },
        user: { _id: application.recruiter },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.roundNumber, 2);
    assert.equal(res.body.data.timeZone, 'Africa/Lagos');
    assert.equal(res.body.data.status, 'Scheduled');
    assert.equal(application.currentStage, 'Applied');
  } finally {
    Application.findOne = findOne;
    Interview.exists = exists;
    Interview.create = create;
  }
});

test('recruiter can reschedule an interview round', async () => {
  const application = makeApplication();
  const interview = makeInterview(application);
  const findApplication = Application.findOne;
  const findInterview = Interview.findOne;
  Application.findOne = async () => application;
  Interview.findOne = async () => interview;

  try {
    const res = makeResponse();
    await updateInterview(
      {
        body: { dateTime: '2026-11-04T15:00:00Z' },
        params: { applicationId: application.id, interviewId: interview.id },
        user: { _id: application.recruiter },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.status, 'Rescheduled');
    assert.equal(res.body.data.dateTime.toISOString(), '2026-11-04T15:00:00.000Z');
  } finally {
    Application.findOne = findApplication;
    Interview.findOne = findInterview;
  }
});

test('recruiter can cancel an interview round', async () => {
  const application = makeApplication();
  const interview = makeInterview(application);
  const findApplication = Application.findOne;
  const findInterview = Interview.findOne;
  Application.findOne = async () => application;
  Interview.findOne = async () => interview;

  try {
    const res = makeResponse();
    await updateInterview(
      {
        body: { status: 'Cancelled' },
        params: { applicationId: application.id, interviewId: interview.id },
        user: { _id: application.recruiter },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.status, 'Cancelled');
  } finally {
    Application.findOne = findApplication;
    Interview.findOne = findInterview;
  }
});

test('recruiter can set an application deadline using a calendar date', async () => {
  const application = makeApplication();
  const findOne = Application.findOne;
  Application.findOne = async () => application;

  try {
    const res = makeResponse();
    await updateApplicationDeadline(
      {
        body: { deadline: '2026-12-01' },
        params: { applicationId: application.id },
        user: { _id: application.recruiter },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.deadline.toISOString(), '2026-12-01T00:00:00.000Z');
  } finally {
    Application.findOne = findOne;
  }
});

test('job seeker application detail includes its separately stored interviews', async () => {
  const application = makeApplication();
  const interview = makeInterview(application);
  const findApplication = Application.findOne;
  const findInterviews = Interview.find;
  Application.findOne = () => ({
    populate: async () => application,
  });
  Interview.find = () => ({
    sort() {
      return this;
    },
    populate: async () => [interview],
  });

  try {
    const res = makeResponse();
    await getJobseekerApplication(
      {
        params: { applicationId: application.id },
        user: { _id: application.jobSeekerId },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.interviews.length, 1);
    assert.equal(res.body.data.interviews[0].roundNumber, 2);
  } finally {
    Application.findOne = findApplication;
    Interview.find = findInterviews;
  }
});
