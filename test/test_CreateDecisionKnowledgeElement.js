const chai = require('chai');

const { setUpJira, createJiraIssue, jira, createDecisionKnowledgeElement } = require('./helpers.js');

const { defaultIssueType } = require('../config.json');

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
   * System function: Create decision knowledge element
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Create a decision knowledge element with the documentation location 'Jira issue text' (=documentation location 's' in the backend)
   * Expected result on GUI: The new knowledge element is visible in the knowledge graph. A comment has been added containing the knowledge element and its type is displayed with a corresponding icon
   * Expected exception: none
   * Postcondition system: The Jira issue has a comment containing the added decision knowledge element
   */
  it('should create a new comment for an existing Jira issue when the documentation location "Jira issue text" is selected (R2)', async () => {
    const task = await createJiraIssue(defaultIssueType, 'Dummy task for R2');

    await createDecisionKnowledgeElement('Dummy decision knowledge issue for R2', 'Issue', 's', task.id, 'i');

    const taskAfterUpdate = await jira.findIssue(task.key);
    chai.expect(taskAfterUpdate.fields.comment.comments).to.be.an('Array').that.contains.something.like({
      body: '{issue}Dummy decision knowledge issue for R2\n{issue}',
    });
  });

  /**
   * TCS: Test create decision knowledge element should give a new alternative the status "idea" (R3)
   *
   * System function: Create decision knowledge element
   * Precondition system: Decision knowledge element with type issue exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Create a new alternative for the issue
   * Expected result on GUI: The alternative is visible on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The new alternative has the status 'idea'
   */
  it('should give a new alternative the status "idea" (R3)', async () => {
    const issue = await createJiraIssue('Issue', 'Which platforms should the app support?');
    const alternative = await createDecisionKnowledgeElement(
      'The app should support Android!',
      'Alternative',
      's',
      issue.id,
      'i'
    );
    chai.expect(alternative).to.have.property('summary', 'The app should support Android!');
    chai.expect(alternative).to.have.property('status', 'idea');
    chai.expect(alternative).to.have.property('type', 'Alternative');
  });

  /**
   * TCS: Test create decision knowledge element should give a new decision the status "decided" (R4)
   *
   * System function: Create decision knowledge element
   * Precondition system: Decision knowledge element with type issue exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Create a new decision for the issue
   * Expected result on GUI: The decision is visible on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The new decision has the status 'decided'
   */
  it('should give a new decision the status "decided" (R4)', async () => {
    const issue = await createJiraIssue('Issue', 'Dummy issue for R4');

    const decision = await createDecisionKnowledgeElement('dummy decision for R4', 'Decision', 's', issue.id, 'i');

    chai.expect(decision).to.have.property('summary', 'dummy decision for R4');
    chai.expect(decision).to.have.property('status', 'decided');
    chai.expect(decision).to.have.property('type', 'Decision');
  });

  /**
   * TCS: Test create decision knowledge element should give a new decision knowledge issue without a linked decision the status "unresolved" (R5)
   *
   * System function: Create decision knowledge element
   * Precondition system: None
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Create a new decision knowledge issue
   * Expected result on GUI: The issue is visible on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The new issue has the status "unresolved"
   */
  it('should give a new decision knowledge issue without a linked decision the status "unresolved" (R5)', async () => {
    const issue = await createDecisionKnowledgeElement('Dummy issue for R5', 'Issue', 'i'); // by default this issue is unlinked

    chai.expect(issue).to.have.property('summary', 'Dummy issue for R5');
    chai.expect(issue).to.have.property('status', 'unresolved');
    chai.expect(issue).to.have.property('type', 'Issue');
  });
});
