const mongoose = require('mongoose');
const Application = require('../models/Application');
const Interview = require('../models/Interview'); // Developer 6's model
const User = require('../models/User');
const StatusHistory = require('../models/StatusHistory');
const AppError = require('../utils/AppError');
const { RECRUITER_TARGETS, validateTransition } = require('../utils/stageTransitions');
const { onStageChanged } = require('../services/pipelineHooks');

const INTERVIEW_TYPES = ['phone', 'video', 'in-person'];

function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Validate BEFORE opening a session so bad payloads never start a transaction.
function parseInterviewInput(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new AppError('Interview details are required when moving to Interview.', 400);
  }

  const dateTime = new Date(raw.dateTime);
  if (!raw.dateTime || Number.isNaN(dateTime.getTime())) {
    throw new AppError('interview.dateTime must be a valid date and time.', 400);
  }
  if (dateTime <= new Date()) {
    throw new AppError('interview.dateTime must be in the future.', 400);
  }

  const timeZone = typeof raw.timeZone === 'string' ? raw.timeZone.trim() : '';
  if (!timeZone || !isValidTimeZone(timeZone)) {
    throw new AppError('interview.timeZone must be a valid IANA time zone, e.g. Africa/Lagos.', 400);
  }

  if (!INTERVIEW_TYPES.includes(raw.type)) {
    throw new AppError(`interview.type must be one of: ${INTERVIEW_TYPES.join(', ')}.`, 400);
  }

  const locationOrLink = typeof raw.locationOrLink === 'string' ? raw.locationOrLink.trim() : '';
  if (!locationOrLink || locationOrLink.length > 500) {
    throw new AppError('interview.locationOrLink is required (max 500 characters).', 400);
  }

  return { dateTime, timeZone, type: raw.type, locationOrLink };
}

exports.updateApplicationStatus = async (req, res, next) => {
  let session;
  try {
    const { applicationId } = req.params;
    const { stage, interview } = req.body || {};
    const recruiterId = req.user.id;

    // ---- Cheap checks first (no DB session yet) ----
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new AppError('Invalid application id.', 400);
    }
    if (!RECRUITER_TARGETS.includes(stage)) {
      throw new AppError(`stage must be one of: ${RECRUITER_TARGETS.join(', ')}.`, 400);
    }
    const interviewInput = stage === 'Interview' ? parseInterviewInput(interview) : null;

    // Verification rule from the brief: pending/rejected recruiters are refused
    const recruiter = await User.findById(recruiterId).select('role verificationStatus').lean();
    if (!recruiter || recruiter.role !== 'recruiter' || recruiter.verificationStatus !== 'verified') {
      throw new AppError('Only verified recruiters can change application stages.', 403);
    }

    // ---- All-or-nothing transaction ----
    
    session = await mongoose.startSession();
    let result;

    await session.withTransaction(async () => {
      // Ownership: the application must belong to THIS recruiter's posting
      const current = await Application.findOne({ _id: applicationId, recruiter: recruiterId }).session(session);
      if (!current) {
        throw new AppError('Application not found.', 404); // 404 not 403: don't reveal other recruiters' data
      }

      const oldStage = current.currentStage;
      validateTransition(oldStage, stage, 'recruiter');

      // Conditional update: if another request changed the stage since we read it, this matches nothing
      const updated = await Application.findOneAndUpdate(
        { _id: applicationId, recruiter: recruiterId, currentStage: oldStage },
        { $set: { currentStage: stage } },
        { new: true, session }
      );
      if (!updated) {
        throw new AppError('Application was changed by another request. Please retry.', 409);
      }

      const history = await StatusHistory.record(
        { application: updated._id, oldStage, newStage: stage, changedBy: recruiterId },
        session
      );

      let interviewDoc = null;
      if (interviewInput) {
        const [created] = await Interview.create(
          [
            {
              application: updated._id,
              roundNumber: 1,
              ...interviewInput,
              setBy: recruiterId,
              status: 'Scheduled',
            },
          ],
          { session }
        );
        interviewDoc = created;
      }

      result = { application: updated, history, interview: interviewDoc, oldStage };
    });

    // ---- After commit: notices, emails, reminders. Failures here must not undo the change. ----
    try {
      await onStageChanged({
        application: result.application,
        oldStage: result.oldStage,
        newStage: stage,
        interview: result.interview,
      });
    } catch (hookErr) {
      console.error('Post-commit stage hook failed:', hookErr);
    }

    res.status(200).json({
      status: 'success',
      data: {
        application: result.application,
        history: result.history,
        interview: result.interview,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    if (session) await session.endSession();
  }
};
