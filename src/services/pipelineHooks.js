/**
 * @param {object} args
 * @param {object} args.application  updated Application document
 * @param {string} args.oldStage
 * @param {string} args.newStage
 * @param {object|null} args.interview
 */
async function onStageChanged({ application, oldStage, newStage, interview }) {
  // TODO (notifications): create in-app notice + email to the job seeker (application.owner)
  //   - Interview: type 'interview_set', include full interview details
  //   - Offer / Rejected: type 'stage_changed'
  //
  // TODO (reminders):
  //   - Interview: create Reminder for the interview (12h while > 24h away, 6h inside 24h)
  //   - Rejected: cancel ALL active reminders for this application immediately
  //
  // Agree with Developer 7 who owns these two calls, e.g.:
  //   await notificationService.notifyStageChange(...)
  //   await reminderService.createInterviewReminders(interview)
  //   await reminderService.cancelForApplication(application._id)
  void application; void oldStage; void newStage; void interview;
}

module.exports = { onStageChanged };
