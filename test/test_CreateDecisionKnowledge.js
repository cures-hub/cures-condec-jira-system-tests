const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  getKnowledgeElements,
  createDecisionKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe('TCS: CONDEC-168', () => {
  // reset Jira project for every test case, to ensure no interference
  beforeEach(async () => {
    // explicitly use issue persistence strategy here
    await setUpJira(true);
  });
  xit(
    // This will be tested elsewhere
    '(R1) If the decision knowledge element is created within an existing knowledge element ' +
      '(Jira issue or code file), a link is created between an existing knowledge' +
      ' element and the new element (CONDEC-291). '
  );
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
    const issue = await createJiraIssue('Issue', 'Dummy issue for R3');
    const alternative = await createDecisionKnowledgeElement(
      'dummy alternative for R3',
      'Alternative',
      's',
      issue.id,
      'i'
    );

    chai
      .expect(alternative)
      .to.have.property('summary', 'dummy alternative for R3');
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

      chai.expect(issue).to.have.prooperty('summary', 'Dummy issue for R5');
      chai.expect(issue).to.have.property('status', 'unresolved');
      chai.expect(issue).to.have.property('type', 'Issue');
    }
  );

  xit(
    // This will be tested elsewhere
    '(R6) A Jira issue (i.e. a decision knowledge element documented as an entire Jira issue) can' +
      ' only be created in a view on the knowledge graph if the user has the rights to create Jira' +
      ' issues (CONDEC-852, integrity).'
  );

  // This will be tested elsewhere
  xit('(R7) If the webhook is activated, it will be fired (CONDEC-185).');

  // Currently there is no way to trigger this through the UI, so we don't test it here.
  xit(
    '(E1) A decision knowledge element with the same summary and description already exists.'
  );

  // This will be tested elsewhere
  xit('(E2) The user does not have the rights for creation.');
});
