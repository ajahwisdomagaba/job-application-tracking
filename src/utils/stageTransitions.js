import AppError from './AppError.js'; 

export const STAGES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

// Stages a recruiter may request through PATCH /recruiter/applications/:id/status
export const RECRUITER_TARGETS = ['Interview', 'Offer', 'Rejected'];

// from -> { to: actorRole }
export const TRANSITIONS = Object.freeze({
  Applied: { Interview: 'recruiter', Rejected: 'recruiter', Withdrawn: 'jobseeker' },
  Interview: { Offer: 'recruiter', Rejected: 'recruiter', Withdrawn: 'jobseeker' },
  Offer: {},
  Rejected: {},
  Withdrawn: {},
});

/**
 * Throws an AppError if the move is not allowed. Returns true otherwise.
 * @param {string} from      current stage
 * @param {string} to        requested stage
 * @param {'recruiter'|'jobseeker'} actorRole
 */
export function validateTransition(from, to, actorRole) {
  if (!STAGES.includes(to)) {
    throw new AppError(`Unknown stage "${to}".`, 400);
  }

  const allowed = TRANSITIONS[from];
  if (!allowed) {
    throw new AppError('Application is in an unrecognised stage.', 500);
  }

  if (Object.keys(allowed).length === 0) {
    throw new AppError(`Application is already ${from}; no further stage changes are allowed.`, 409);
  }

  const requiredActor = allowed[to];
  if (!requiredActor) {
    throw new AppError(`Cannot move an application from ${from} to ${to}.`, 409);
  }

  if (requiredActor !== actorRole) {
    throw new AppError(`Only a ${requiredActor} can move an application from ${from} to ${to}.`, 403);
  }

  return true;
}