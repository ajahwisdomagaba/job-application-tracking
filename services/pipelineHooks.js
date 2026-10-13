
/**
 * @param {object} args
 * @param {object} args.application  updated Application document
 * @param {string} args.oldStage
 * @param {string} args.newStage
 * @param {object|null} args.interview  round 1 Interview document when newStage === 'Interview'
 */
async function onStageChanged({ application, oldStage, newStage, interview }) {
  
  void application; void oldStage; void newStage; void interview;
}

module.exports = { onStageChanged };
