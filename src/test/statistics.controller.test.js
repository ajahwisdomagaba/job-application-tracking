import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { getJobseekerStatistics } from '../controllers/statistics.controller.js';
import Application from '../models/Application.js';

test('job-seeker statistics are scoped to the authenticated owner', async () => {
  const owner = new mongoose.Types.ObjectId();
  const originalAggregate = Application.aggregate;
  let pipeline;

  Application.aggregate = async (receivedPipeline) => {
    pipeline = receivedPipeline;
    return [{
      summary: [{
        totalApplications: 3,
        activeApplications: 1,
        interviews: 1,
        offers: 1,
        rejected: 1,
        withdrawn: 0,
        offerRate: 33.33,
      }],
      byStage: [{ stage: 'Offer', count: 1 }],
      overTime: [],
    }];
  };

  const response = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  try {
    await getJobseekerStatistics(
      { user: { _id: owner }, query: {} },
      response,
      (error) => assert.fail(error),
    );
  } finally {
    Application.aggregate = originalAggregate;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.data.summary.totalApplications, 3);
  assert.equal(pipeline[0].$match.owner.toString(), owner.toString());
  assert.equal(pipeline[1].$facet.overTime[0].$group._id.$dateTrunc.unit, 'day');
});
