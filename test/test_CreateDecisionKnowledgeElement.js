const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  createDecisionKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

/**
 * CONDEC-168: Create decision knowledge element
 */
describe('TCS: Test create decision knowledge element', () => {
  // reset Jira project for every test case, to ensure no interference
  beforeEach(async () => {
    // explicitly use issue persistence strategy here
    await setUpJira(true);
  });

  /**
   * TCS: Test create decision knowledge element should create a new comment for an existing Jira issue when the documentation location "Jira issue text" is selected (R2)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Create a decision knowledge element with the documentation location
   *    'Jira issue text' (= docuementation location 's' in the backend)
   *
   * Step 2: Verify that the Jira issue has a comment containing the added
   *     decision knowledge element
   *
   * Postcondition: The Jira issue has a comment containing the added decision
   *     knowledge element
   */
  it('should create a new comment for an existing Jira issue when the documentation location "Jira issue text" is selected (R2)', async () => {
    // Precondition: Jira issue exists
    const task = await createJiraIssue('Task', 'Dummy task for R2');

    // Step 1: Create a decision knowledge element with the documentation
    // location 'Jira issue text' (=docuementation location 's' in the backend)
    await createDecisionKnowledgeElement(
      'Dummy decision knowledge issue for R2',
      'Issue',
      's',
      task.id,
      'i'
    );

    // Step 2: Verify that the Jira issue has a comment containing the added decision knowledge element
    const taskAfterUpdate = await jira.findIssue(task.key);

    chai
      .expect(taskAfterUpdate.fields.comment.comments)
      .to.be.an('Array')
      .that.contains.something.like({
        body: '{issue}Dummy decision knowledge issue for R2\n{issue}',
      });
  });

  /**
   * TCS: Test create decision knowledge element should give a new alternative the status "idea" (R3)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Create a new alternative
   *
   * Step 2: Verify that the new alternative has the status 'idea'
   *
   * Postcondition: The new alternative has the status idea
   */
  it('should give a new alternative the status "idea" (R3)', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue(
      'Issue',
      'Which platforms should the app support?'
    );
    // Step 1: Create a new alternative
    const alternative = await createDecisionKnowledgeElement(
      'The app should support Android!',
      'Alternative',
      's',
      issue.id,
      'i'
    );
    // Step 2: Verify that the new alternative has the status 'idea'
    chai
      .expect(alternative)
      .to.have.property('summary', 'The app should support Android!');
    chai.expect(alternative).to.have.property('status', 'idea');
    chai.expect(alternative).to.have.property('type', 'Alternative');
  });

  /**
   * TCS: Test create decision knowledge element should give a new decision the status "decided" (R4)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Create a decision element
   *
   * Step 2: Verify that the decision has the status "decided"
   *
   * Postcondition: The decision has the status "decided"
   */
  it('should give a new decision the status "decided" (R4)', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue('Issue', 'Dummy issue for R4');

    // Step 1: Create a decision element
    const decision = await createDecisionKnowledgeElement(
      'dummy decision for R4',
      'Decision',
      's',
      issue.id,
      'i'
    );

    // Step 2: Verify that the decision has the status "decided"
    chai.expect(decision).to.have.property('summary', 'dummy decision for R4');
    chai.expect(decision).to.have.property('status', 'decided');
    chai.expect(decision).to.have.property('type', 'Decision');
  });

  /**
   * TCS: Test create decision knowledge element should give a new decision knowledge issue without a linked decision the status "unresolved" (R5)
   *
   * Precondition: None
   *
   * Step 1: Create a new decision knowledge issue
   *
   * Step 2: Verify the status of the new issue is "unresolved"
   *
   * Postcondition: The status of the new issue is "unresolved"
   */
  it('should give a new decision knowledge issue without a linked decision the status "unresolved" (R5)', async () => {
    const issue = await createDecisionKnowledgeElement(
      'Dummy issue for R5',
      'Issue',
      'i'
    ); // by default this issue is unlinked

    chai.expect(issue).to.have.property('summary', 'Dummy issue for R5');
    chai.expect(issue).to.have.property('status', 'unresolved');
    chai.expect(issue).to.have.property('type', 'Issue');
  });
});
