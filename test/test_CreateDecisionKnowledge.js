const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  createDecisionKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe.only('TCS: CONDEC-168', () => {
  // reset Jira project for every test case, to ensure no interference
  beforeEach(async () => {
    // explicitly use issue persistence strategy here
    await setUpJira(true);
  });

  it(
    '(R2) If the documentation location of the new decision knowledge element is "Jira issue ' +
      'text", a new comment in an existing Jira issue is created, which contains the new decision' +
      ' knowledge element.',
    async () => {
      const task = await createJiraIssue('Task', 'Dummy task for R2');
      await createDecisionKnowledgeElement(
        'Dummy decision knowledge issue for R2',
        'Issue',
        's',
        task.id,
        'i'
      );
      const taskAfterUpdate = await jira.findIssue(task.key);

      chai
        .expect(taskAfterUpdate.fields.comment.comments)
        .to.be.an('Array')
        .that.contains.something.like({
          body: '{issue}Dummy decision knowledge issue for R2\n{issue}',
        });
    }
  );
  it('(R3) A new alternative has the status "idea".', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue(
      'Issue',
      'Which platforms should the app support?'
    );
    // Step 1: create a new alternative
    const alternative = await createDecisionKnowledgeElement(
      'The app should support Android!',
      'Alternative',
      's',
      issue.id,
      'i'
    );
    // Step 2: verify that the new alternative has the status 'idea'
    chai
      .expect(alternative)
      .to.have.property('summary', 'The app should support Android!');
    chai.expect(alternative).to.have.property('status', 'idea');
    chai.expect(alternative).to.have.property('type', 'Alternative');
  });

  it('(R4) A new decision has the status "decided".', async () => {
    const issue = await createJiraIssue('Issue', 'Dummy issue for R4');
    const decision = await createDecisionKnowledgeElement(
      'dummy decision for R4',
      'Decision',
      's',
      issue.id,
      'i'
    );
    chai.expect(decision).to.have.property('summary', 'dummy decision for R4');
    chai.expect(decision).to.have.property('status', 'decided');
    chai.expect(decision).to.have.property('type', 'Decision');
  });
  it(
    '(R5) A new issue (=decision problem), i.e. an issue without linked decision has' +
      ' the status "unresolved".',
    async () => {
      const issue = await createDecisionKnowledgeElement(
        'Dummy issue for R5',
        'Issue',
        'i'
      ); // by default this issue is unlinked

      chai.expect(issue).to.have.property('summary', 'Dummy issue for R5');
      chai.expect(issue).to.have.property('status', 'unresolved');
      chai.expect(issue).to.have.property('type', 'Issue');
    }
  );
});
