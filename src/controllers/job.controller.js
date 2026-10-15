// controllers/job.controller.js  (ES module version)
// Public, read-only job board.
//   GET /api/v1/jobs?field=&search=&page=1&limit=10
//   GET /api/v1/jobs/:jobId

import mongoose from 'mongoose';
import JobPost from '../models/JobPost.js';
import AppError from '../utils/AppError.js'; // assumed default export: new AppError(message, statusCode)

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Public output: never expose the recruiter reference or any personal contact detail.
const PUBLIC_FIELDS = '-recruiter -__v';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const listJobs = async (req, res, next) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

    // Only Open postings that have not passed their closing date
    const filter = JobPost.openFilter();

    // Field filter: case-insensitive exact match, e.g. ?field=Data and AI
    if (typeof req.query.field === 'string' && req.query.field.trim()) {
      filter.field = new RegExp(`^${escapeRegex(req.query.field.trim())}$`, 'i');
    }

    // Keyword search. Input is escaped so it can't inject a regex.
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const term = req.query.search.trim().slice(0, 100);
      const rx = new RegExp(escapeRegex(term), 'i');
      filter.$or = [
        { title: rx },
        { companyName: rx },
        { field: rx },
        { description: rx },
        { location: rx },
        { requirements: rx },
      ];
    }

    const [jobs, total] = await Promise.all([
      JobPost.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      JobPost.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      results: jobs.length,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: { jobs },
    });
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      throw new AppError('Invalid job id.', 400);
    }

    // Closed or expired postings are treated as not found for the public
    const job = await JobPost.findOne({ _id: jobId, ...JobPost.openFilter() })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!job) {
      throw new AppError('Job not found.', 404);
    }

    res.status(200).json({ status: 'success', data: { job } });
  } catch (err) {
    next(err);
  }
};
