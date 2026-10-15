import cron from 'node-cron';
import Reminder from '../models/Reminder.js';
import Notification from '../models/Notification.js';
import Interview from '../models/Interview.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { sendEmail } from './email.service.js';

// Helper: Calculate next interval and send time based on the target event
const calculateNextSend = (targetDateTime, currentInterval) => {
  const now = new Date();
  const msUntil = new Date(targetDateTime).getTime() - now.getTime();

  // Past event -> Deactivate
  if (msUntil <= 0) {
    return { shouldDeactivate: true };
  }

  const hoursUntil = msUntil / (1000 * 60 * 60);

  // Transition from 12h to 6h once within 24h threshold
  let nextInterval = currentInterval;
  let hoursToAdd = 12;

  if (hoursUntil <= 24) {
    nextInterval = '6h';
    hoursToAdd = 6;
  }

  const candidateTime = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

  // Reminders must stop once interview time is reached
  if (candidateTime >= new Date(targetDateTime)) {
    return { shouldDeactivate: true };
  }

  return {
    shouldDeactivate: false,
    nextSendTime: candidateTime,
    repeatInterval: nextInterval,
  };
};

export const describeDueReminder = async (lockedReminder) => {
  if (lockedReminder.source === 'interview') {
    const interview = await Interview.findById(lockedReminder.sourceId);
    if (!interview || interview.status === 'Cancelled') {
      return { deactivate: true };
    }
    const when = new Date(interview.dateTime).toLocaleString('en-US', {
      timeZone: interview.timeZone || 'Africa/Lagos',
    });
    return {
      deactivate: false,
      targetDateTime: interview.dateTime,
      message: `Reminder: You have an upcoming interview round ${interview.roundNumber} on ${when} (${interview.type}).`,
    };
  }

  if (lockedReminder.source === 'deadline') {
    const app = await Application.findById(lockedReminder.application);
    if (!app?.deadline) {
      return { deactivate: true };
    }
    return {
      deactivate: false,
      targetDateTime: app.deadline,
      message: `Reminder: Application deadline for ${app.jobTitle} at ${app.companyName} is in 24 hours.`,
    };
  }

  return { deactivate: true };
};

export const startCronDaemon = () => {
  // Runs every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Find due reminders
      const dueReminders = await Reminder.find({
        isActive: true,
        nextSendTime: { $lte: now },
      });

      for (const reminder of dueReminders) {
        // ATOMIC FETCH & SHIFT GUARD:
        // Lock this reminder immediately by moving nextSendTime 1 hour out to prevent double-sends in concurrent ticks
        const lockedReminder = await Reminder.findOneAndUpdate(
          {
            _id: reminder._id,
            isActive: true,
            nextSendTime: reminder.nextSendTime, // concurrency guard
          },
          {
            $set: { nextSendTime: new Date(now.getTime() + 60 * 60 * 1000) },
          },
          { new: true }
        );

        if (!lockedReminder) continue; // Picked up by another concurrent run

        let message = '';
        let targetDateTime = null;

        const dispatch = await describeDueReminder(lockedReminder);
        if (dispatch.deactivate) {
          await Reminder.findByIdAndUpdate(lockedReminder._id, { isActive: false });
          continue;
        }
        message = dispatch.message;
        targetDateTime = dispatch.targetDateTime;

        // 1. Dispatch In-App Notification
        await Notification.create({
          recipient: lockedReminder.recipient,
          application: lockedReminder.application,
          type: 'reminder',
          message,
        });

        // 2. Dispatch email. A missing mailbox or SMTP config must not stop the schedule.
        try {
          const user = await User.findById(lockedReminder.recipient).select('email');
          if (user?.email) {
            await sendEmail({
              to: user.email,
              subject: 'Job Application Reminder',
              text: message,
            });
          }
        } catch (emailError) {
          console.error('Reminder email could not be sent:', emailError.message);
        }

        // 3. Update or Deactivate Reminder
        if (lockedReminder.repeatInterval === 'once') {
          await Reminder.findByIdAndUpdate(lockedReminder._id, { isActive: false });
        } else if (targetDateTime) {
          const nextState = calculateNextSend(targetDateTime, lockedReminder.repeatInterval);
          if (nextState.shouldDeactivate) {
            await Reminder.findByIdAndUpdate(lockedReminder._id, { isActive: false });
          } else {
            await Reminder.findByIdAndUpdate(lockedReminder._id, {
              nextSendTime: nextState.nextSendTime,
              repeatInterval: nextState.repeatInterval,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error running cron reminder daemon:', error.message);
    }
  });

  console.log('Cron reminder daemon initialized (running every 5 minutes).');
};