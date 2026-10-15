import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from './email.service.js';

const NOTIFIED_STAGES = new Set(['Interview', 'Offer', 'Rejected']);

const interviewMessage = (interview) => {
  const timeZone = interview.timeZone || 'Africa/Lagos';
  const when = new Date(interview.dateTime).toLocaleString('en-US', { timeZone });
  return `Interview round ${interview.roundNumber} is set for ${when} (${timeZone}). Type: ${interview.type}. Location or link: ${interview.locationOrLink}.`;
};

const stageMessage = (application, oldStage, newStage) =>
  `Your application for ${application.jobTitle} at ${application.companyName} moved from ${oldStage} to ${newStage}.`;

/**
 * In-app notice and email for the job seeker after a committed stage change.
 * Reminder rows are created and cancelled by the status, interview, and deadline handlers.
 */
export async function onStageChanged({ application, oldStage, newStage, interview }) {
  if (!NOTIFIED_STAGES.has(newStage)) return;

  const isInterview = newStage === 'Interview' && interview;
  const type = isInterview ? 'interview_set' : 'stage_changed';
  const message = isInterview
    ? interviewMessage(interview)
    : stageMessage(application, oldStage, newStage);

  await Notification.create({
    recipient: application.owner,
    application: application._id,
    type,
    message,
  });

  try {
    const seeker = await User.findById(application.owner).select('email name');
    if (!seeker?.email) return;
    await sendEmail({
      to: seeker.email,
      subject: isInterview ? 'Interview scheduled' : `Application ${newStage}`,
      text: `Hello ${seeker.name || 'there'},\n\n${message}`,
    });
  } catch (error) {
    console.error('Stage-change email could not be sent:', error.message);
  }
}
