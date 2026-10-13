import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';

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
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/
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

const parseDeadline = (value) => {
  if (typeof value !== 'string') {
    throw createError(400, 'deadline must be a valid ISO date or date-time.');
  }
  let deadline;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    deadline = new Date(`${value}T00:00:00Z`);
    if (
      Number.isNaN(deadline.getTime()) ||
      deadline.toISOString().slice(0, 10) !== value
    ) {
      throw createError(400, 'deadline must be a valid ISO date or date-time.');
    }
  } else {
    deadline = parseDateTime(value);
  }
  if (Number.isNaN(deadline.getTime())) {
    throw createError(400, 'deadline must be a valid ISO date or date-time.');
  }
  return deadline;
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

const findApplication = async (applicationId, ownerField, ownerId) => {
  assertApplicationId(applicationId);
  const application = await Application.findOne({
    _id: applicationId,
    [ownerField]: ownerId,
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

    await findApplication(
      req.params.applicationId,
      'recruiter',
      req.user._id
    );
    if (await Interview.exists({ application: req.params.applicationId, roundNumber })) {
      throw createError(409, `Interview round ${roundNumber} already exists.`);
    }

    const interview = await Interview.create(scheduledInterview);

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
        'Provide valid interview updates: dateTime, timeZone, type, locationOrLink, or status.'
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

    await findApplication(
      req.params.applicationId,
      'recruiter',
      req.user._id
    );
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

export const updateApplicationDeadline = async (req, res, next) => {
  try {
    assertObjectBody(req.body);
    if (Object.keys(req.body).some((key) => key !== 'deadline')) {
      throw createError(400, 'Only the deadline field may be updated.');
    }
    const deadline = parseDeadline(req.body.deadline);

    const application = await findApplication(
      req.params.applicationId,
      'recruiter',
      req.user._id
    );
    application.deadline = deadline;
    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application deadline updated successfully.',
      data: { deadline: application.deadline },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobseekerApplication = async (req, res, next) => {
  try {
    assertApplicationId(req.params.applicationId);
    const application = await Application.findOne({
      _id: req.params.applicationId,
      jobSeekerId: req.user._id,
    }).populate('recruiter', 'name companyName');

    if (!application) {
      throw createError(404, 'Application not found.');
    }
    const interviews = await Interview.find({ application: application._id })
      .sort({ roundNumber: 1 })
      .populate('setBy', 'name companyName');

    res.status(200).json({
      success: true,
      message: 'Application details fetched successfully.',
      data: { ...application.toObject(), interviews },
    });
  } catch (error) {
    next(error);
  }
};
