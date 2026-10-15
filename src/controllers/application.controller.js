import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import JobPost from '../models/JobPost.js';
import Notification from '../models/Notification.js';
import Reminder from '../models/Reminder.js';
import StatusHistory from '../models/statusHistory.js';
import { validateTransition } from '../utils/stageTransitions.js';
import {
  cancelAllApplicationReminders,
  scheduleDeadlineReminder,
  scheduleInterviewReminders,
} from '../services/reminderLifecycle.service.js';

const STAGES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

const closingInstant = (closingDate) => {
  const closing = new Date(closingDate);
  if (Number.isNaN(closing.getTime())) return null;
  const end = new Date(closing);
  if (
    end.getUTCHours() === 0 &&
    end.getUTCMinutes() === 0 &&
    end.getUTCSeconds() === 0 &&
    end.getUTCMilliseconds() === 0
  ) {
    end.setUTCHours(23, 59, 59, 999);
  }
  return end;
};

const parseRangeDate = (value, fieldName, endOfDay = false) => {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  if (endOfDay && dateOnly) date.setUTCHours(23, 59, 59, 999);
  return date;
};

// @desc    Apply for a job posting
// @route   POST /api/v1/jobs/:jobId/apply
// @access  Private (Job seeker)
export const applyToJob = async (req, res, next) => {
  let application;
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job id',
      });
    }

    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    const closesAt = closingInstant(job.closingDate);
    if (job.status !== 'Open' || !closesAt || closesAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This job posting is closed or past its closing date',
      });
    }

    const existingApplication = await Application.findOne({
      owner: userId,
      job: jobId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    application = await Application.create({
      owner: userId,
      job: job._id,
      recruiter: job.recruiter,
      companyName: job.companyName,
      jobTitle: job.title,
      currentStage: 'Applied',
    });

    await Notification.create({
      recipient: job.recruiter,
      application: application._id,
      type: 'new_application',
      message: `A new application has been submitted for ${job.title}`,
    });

    await StatusHistory.record({
      application: application._id,
      oldStage: null,
      newStage: 'Applied',
      changedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    if (application) {
      await Notification.deleteMany({ application: application._id });
      await Application.deleteOne({ _id: application._id });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }
    next(error);
  }
};

// @desc    Get logged in job seeker's applications
// @route   GET /api/v1/applications
// @access  Private (Job seeker)
export const getApplications = async (req, res, next) => {
  try {
    const { stage, company, date, from, to, sort } = req.query;

    const filter = { owner: req.user._id };

    if (stage) {
      if (!STAGES.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: `stage must be one of: ${STAGES.join(', ')}`,
        });
      }
      filter.currentStage = stage;
    }

    if (company) {
      const escaped = String(company).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.companyName = { $regex: escaped, $options: 'i' };
    }

    if (date) {
      const start = parseRangeDate(date, 'date');
      const end = new Date(start);
      end.setUTCHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (from || to) {
      const createdAt = {};
      if (from) createdAt.$gte = parseRangeDate(from, 'from');
      if (to) createdAt.$lte = parseRangeDate(to, 'to', true);
      if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
        return res.status(400).json({
          success: false,
          message: 'from must be earlier than or equal to to',
        });
      }
      filter.createdAt = createdAt;
    }

    const sortOptions = { createdAt: -1 };
    if (sort === 'oldest') sortOptions.createdAt = 1;
    else if (sort === 'company') {
      delete sortOptions.createdAt;
      sortOptions.companyName = 1;
    } else if (sort && sort !== 'newest') {
      return res.status(400).json({
        success: false,
        message: 'sort must be one of: newest, oldest, company',
      });
    }

    const applications = await Application.find(filter)
      .populate('job', 'title salaryMin salaryMax salaryCurrency location status')
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job seeker application detail view
// @route   GET /api/v1/applications/:applicationId
// @access  Private (Job seeker)
export const getJobseekerApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID.',
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      owner: req.user._id,
    }).populate([
      { path: 'recruiter', select: 'name companyName' },
      { path: 'job' },
    ]);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    const [timeline, interviews, reminders] = await Promise.all([
      StatusHistory.find({ application: application._id })
        .sort({ changedAt: 1 })
        .populate('changedBy', 'name'),
      Interview.find({ application: application._id })
        .sort({ roundNumber: 1 })
        .populate('setBy', 'name companyName'),
      Reminder.find({
        application: application._id,
        recipient: req.user._id,
      }).sort({ nextSendTime: 1 }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Application details fetched successfully.',
      data: { ...application.toObject(), timeline, interviews, reminders },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw an active application
// @route   PATCH /api/v1/applications/:applicationId/withdraw
// @access  Private (Job seeker)
export const withdrawApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    // Find application and ensure ownership
    const application = await Application.findOne({
      _id: applicationId,
      owner: userId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const oldStage = application.currentStage;
    validateTransition(oldStage, 'Withdrawn', 'jobseeker');

    application.currentStage = 'Withdrawn';
    await application.save();

    try {
      await StatusHistory.record({
        application: application._id,
        oldStage,
        newStage: 'Withdrawn',
        changedBy: userId,
      });
    } catch (historyError) {
      application.currentStage = oldStage;
      await application.save();
      throw historyError;
    }

    await cancelAllApplicationReminders(application._id);

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application deadline (Recruiter)
// @route   PATCH /api/v1/recruiter/applications/:applicationId/deadline
// @access  Private (Recruiter)
export const updateApplicationDeadline = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { deadline } = req.body;

    if (!deadline) {
      return res.status(400).json({
        success: false,
        message: 'Deadline field is required.',
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or unauthorized.',
      });
    }

    const parsedDeadline = new Date(deadline);
    if (Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'deadline must be a valid date.',
      });
    }

    application.deadline = parsedDeadline;
    await application.save();
    // Schedule a deadline reminder for the application
    await scheduleDeadlineReminder({
      recipient: application.owner,
      application: application._id,
      deadlineDate: application.deadline,
    });

    res.status(200).json({
      success: true,
      message: 'Application deadline updated successfully.',
      data: { deadline: application.deadline },
    });
  } catch (error) {
    next(error);
  }
};

const allowedInterviewUpdates = new Set([
  'dateTime',
  'timeZone',
  'type',
  'locationOrLink',
  'status',
]);
const interviewTypes = new Set(['phone', 'video', 'in-person']);
const interviewStatuses = new Set(['Scheduled', 'Rescheduled', 'Cancelled']);

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertApplicationId = (applicationId) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    throw createError(400, 'Invalid application ID.');
  }
};

const parseDateTime = (value) => {
  if (typeof value !== 'string') {
    throw createError(400, 'dateTime must be an ISO date-time with a UTC offset.');
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (
    !match ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    (match[4] !== undefined && Number(match[4]) > 59)
  ) {
    throw createError(400, 'dateTime must be an ISO date-time with a UTC offset.');
  }
  const normalizedDate = new Date(`${match[1]}T00:00:00Z`);
  if (
    Number.isNaN(normalizedDate.getTime()) ||
    normalizedDate.toISOString().slice(0, 10) !== match[1]
  ) {
    throw createError(400, 'dateTime must be a valid date-time.');
  }

  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw createError(400, 'dateTime must be a valid date-time.');
  }
  return scheduledAt;
};

const assertObjectBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError(400, 'A JSON object request body is required.');
  }
};

const assertTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || !timeZone.trim()) {
    throw createError(400, 'A valid IANA timeZone is required.');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch (error) {
    if (error instanceof RangeError) {
      throw createError(400, 'A valid IANA timeZone is required.');
    }
    throw error;
  }
};

const assertInterviewType = (type) => {
  if (!interviewTypes.has(type)) {
    throw createError(400, 'type must be phone, video, or in-person.');
  }
};

const assertLocationOrLink = (locationOrLink) => {
  if (typeof locationOrLink !== 'string' || !locationOrLink.trim()) {
    throw createError(400, 'locationOrLink is required.');
  }
};

const findOwnedApplication = async (applicationId, ownerId) => {
  assertApplicationId(applicationId);
  const application = await Application.findOne({
    _id: applicationId,
    recruiter: ownerId,
  });
  if (!application) {
    throw createError(404, 'Application not found.');
  }
  return application;
};

export const scheduleInterview = async (req, res, next) => {
  try {
    assertObjectBody(req.body);
    const { roundNumber, dateTime, timeZone, type, locationOrLink } = req.body;
    if (!Number.isInteger(roundNumber) || roundNumber < 2) {
      throw createError(400, 'roundNumber must be an integer of 2 or greater.');
    }
    const scheduledInterview = {
      application: req.params.applicationId,
      roundNumber,
      dateTime: parseDateTime(dateTime),
      ...(timeZone !== undefined && { timeZone }),
      type,
      locationOrLink,
      setBy: req.user._id,
      status: 'Scheduled',
    };
    if (timeZone !== undefined) assertTimeZone(timeZone);
    assertInterviewType(type);
    assertLocationOrLink(locationOrLink);


    // Schedule an interview reminder for the application
    const application = await findOwnedApplication(req.params.applicationId, req.user._id);
    if (await Interview.exists({ application: req.params.applicationId, roundNumber })) {
      throw createError(409, `Interview round ${roundNumber} already exists.`);
    }

    const interview = await Interview.create(scheduledInterview);

    await scheduleInterviewReminders({
      recipient: application.owner,
      application: application._id,
      interviewId: interview._id,
      dateTime: interview.dateTime,
    });

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully.',
      data: interview,
    });
  } catch (error) {
    if (error.code === 11000) {
      next(createError(409, 'An interview already exists for that application round.'));
    } else {
      next(error);
    }
  }
};

export const updateInterview = async (req, res, next) => {
  try {
    assertObjectBody(req.body);
    const updates = { ...req.body };
    const updateKeys = Object.keys(updates);
    if (!updateKeys.length || updateKeys.some((key) => !allowedInterviewUpdates.has(key))) {
      throw createError(
        400,
        'Provide valid interview updates: dateTime, timeZone, type, locationOrLink, or status.',
      );
    }

    if (updates.status !== undefined && !interviewStatuses.has(updates.status)) {
      throw createError(400, 'status must be Scheduled, Rescheduled, or Cancelled.');
    }
    if (updates.dateTime !== undefined) {
      updates.dateTime = parseDateTime(updates.dateTime);
    }
    if (updates.timeZone !== undefined) assertTimeZone(updates.timeZone);
    if (updates.type !== undefined) assertInterviewType(updates.type);
    if (updates.locationOrLink !== undefined) assertLocationOrLink(updates.locationOrLink);

    await findOwnedApplication(req.params.applicationId, req.user._id);
    if (!mongoose.isValidObjectId(req.params.interviewId)) {
      throw createError(400, 'Invalid interview ID.');
    }
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      application: req.params.applicationId,
      setBy: req.user._id,
    });
    if (!interview) {
      throw createError(404, 'Interview not found.');
    }

    for (const key of updateKeys) {
      interview[key] = updates[key];
    }
    if (updates.dateTime !== undefined && updates.status === undefined) {
      interview.status = 'Rescheduled';
    }
    await interview.save();

    res.status(200).json({
      success: true,
      message: 'Interview updated successfully.',
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};