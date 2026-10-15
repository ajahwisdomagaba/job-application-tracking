import Reminder from "../models/Reminder.js";

/**
 * This service is responsible for the lifecycle of reminders.
 * calculates initial nextsendtime based on the repeat interval and the current time
 * rule: 
 * more than 24 hours: starts now (or 12 hours before) and repeats every 12 hours
 * less than 24 hours: starts now (or 6 hours before) and repeats every 6 hours
 */
    
export const scheduleInterviewReminders = async ({ recipient, application, interviewId, dateTime }) => {
  const targetDate = new Date(dateTime);
  const now = new Date();
  const msUntil = targetDate.getTime() - now.getTime();

  if (msUntil <= 0) return; // Interview is already in the past

  const hoursUntil = msUntil / (1000 * 60 * 60);
  const repeatInterval = hoursUntil > 24 ? '12h' : '6h';

  // First reminder scheduled immediately or after initial window
  const nextSendTime = new Date(now.getTime() + (hoursUntil > 24 ? 12 : 6) * 60 * 60 * 1000);

  // If next send time exceeds the actual interview, send halfway instead
  const scheduledTime = nextSendTime >= targetDate ? new Date(now.getTime() + msUntil / 2) : nextSendTime;

  await Reminder.create({
    recipient,
    application,
    source: 'interview',
    sourceId: interviewId,
    nextSendTime: scheduledTime,
    repeatInterval,
    isActive: true,
  });
};

/**
 * Schedules a single deadline reminder exactly 24 hours prior to deadline.
 */
export const scheduleDeadlineReminder = async ({ recipient, application, deadlineDate }) => {
  // Cancel previous deadline reminders for this application
  await Reminder.updateMany(
    { application, source: 'deadline', isActive: true },
    { $set: { isActive: false } }
  );

  const targetDate = new Date(deadlineDate);
  const twentyFourHoursBefore = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();

  // Only schedule if 24 hours before deadline is still in the future
  if (twentyFourHoursBefore > now) {
    await Reminder.create({
      recipient,
      application,
      source: 'deadline',
      sourceId: application,
      nextSendTime: twentyFourHoursBefore,
      repeatInterval: 'once',
      isActive: true,
    });
  }
};

/**
 * Cancels all remaining reminders for an application (e.g. stage became Rejected or Withdrawn).
 */
export const cancelAllApplicationReminders = async (applicationId) => {
  await Reminder.updateMany(
    { application: applicationId, isActive: true },
    { $set: { isActive: false } }
  );
};

/**
 * Cancels reminders tied to a specific interview round (e.g., round cancelled or rescheduled).
 */
export const cancelInterviewRoundReminders = async (interviewId) => {
  await Reminder.updateMany(
    { sourceId: interviewId, source: 'interview', isActive: true },
    { $set: { isActive: false } }
  );
};