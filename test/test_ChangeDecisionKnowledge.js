const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  createDecisionKnowledgeElement,
  getKnowledgeElements,
  updateDecisionKnowledgeElement,
  getSpecificKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe('TCS: CONDEC-169', () => {
  before(async () => {
    await setUpJira(true); // These tests need the Jira issue strategy, so we explicitly set it here
  });
  it('(R1) If an alternative is changed to a decision, its status is changed to "decided".', async () => {
    // Create a Jira issue and a comment containing decision knowledge
    const jiraTask = await createJiraIssue(
      'Task',
      'Enable persistence of user data'
    );

    const issue = await createDecisionKnowledgeElement(
      'Which database should be used to store user data?',
      'Issue',
      's',
      jiraTask.id,
      'i'
    );
    const alternative = await createDecisionKnowledgeElement(
      'Use Postgres to store user data!',
      'Alternative',
      's',
      jiraTask.id,
      'i'
    );
    const updatedAlternative = Object.assign(alternative, { type: 'Decision' });
    await updateDecisionKnowledgeElement(issue.id, 'i', updatedAlternative);
    const decisionKnowledgeAfterChange = await getKnowledgeElements();
    chai
      .expect(decisionKnowledgeAfterChange)
      .to.be.an('Array')
      .that.contains.something.like({
        id: alternative.id,
        type: 'Decision',
        status: 'decided',
      });
  });

  it(
    '(R2) If the user tries to change a decision to an alternative, ' +
      'the knowledge type cannot be changed (i.e. it stays a decision), ' +
      'but the status of the decision is changed to "rejected". ',
    async () => {
      const issue = await createDecisionKnowledgeElement(
        'Only users with admin rights should be able to set the toggle!',
        'Decision',
        'i'
      );
      const updatePayload = Object.assign(issue, { type: 'Alternative' });

      await updateDecisionKnowledgeElement(0, null, updatePayload);
      const updatedIssue = await getSpecificKnowledgeElement(issue.id, 'i');
      chai.expect(updatedIssue).to.be.like({
        id: issue.id,
        type: 'Decision',
        status: 'rejected',
      });
    }
  );
  it(
    '(R3) If the status of a decision is set to "challenged" or "rejected", the status ' +
      'of the linked issue (=decision problem) is set to "unresolved" (if the issue does ' +
      'not have any other decisions in status "decided" linked).',
    async () => {
      // First part: check for status 'challenged'
      const issue1 = await createDecisionKnowledgeElement(
        'Which font should be used in the user interface?',
        'Issue',
        'i'
      );
      const decision1 = await createDecisionKnowledgeElement(
        'Use Wingdings for the user interface font!',
        'Decision',
        'i',
        issue1.id,
        'i'
      );
      const update1Payload = Object.assign(decision1, { status: 'challenged' });
      await updateDecisionKnowledgeElement(0, null, update1Payload);

      const issue1AfterUpdate = await getSpecificKnowledgeElement(
        issue1.id,
        'i'
      );
      chai
        .expect(issue1AfterUpdate)
        .to.be.like({ id: issue1.id, status: 'unresolved' });

      // Second part: check for status 'rejected'
      const issue2 = await createDecisionKnowledgeElement(
        'Which color scheme should be used for the website?',
        'Issue',
        'i'
      );
      const decision2 = await createDecisionKnowledgeElement(
        'Use a dark color scheme for the website!',
        'Decision',
        'i',
        issue2.id,
        'i'
      );
      const update2Payload = Object.assign(decision2, { status: 'rejected' });
      await updateDecisionKnowledgeElement(0, null, update2Payload);

      const issue2AfterUpdate = await getSpecificKnowledgeElement(
        issue2.id,
        'i'
      );
      chai
        .expect(issue2AfterUpdate)
        .to.be.like({ id: issue2.id, status: 'unresolved' });
    }
  );
  it(
    '(R4) If the status of a decision is set to "decided" or if an alternative is changed to a ' +
      'decision (with status "decided"), the status of the linked issue (=decision problem) ' +
      'is set to "resolved".',
    async () => {
      // Case one: decision has status decided when linked to an issue
      const issue1 = await createDecisionKnowledgeElement(
        'Which options should be available for setting font size?',
        'Issue',
        'i'
      );
      const decision = await createDecisionKnowledgeElement(
        'Options for small, medium, and large should be available!',
        'Decision',
        'i',
        issue1.id,
        'i'
      );
      const issue1AfterAddingDecision = await getSpecificKnowledgeElement(
        issue1.id,
        'i'
      );
      chai.expect(decision.status).to.eql('decided');
      chai.expect(issue1AfterAddingDecision.status).to.eql('resolved');

      // Case two: alternative is changed to decision
      const issue2 = await createDecisionKnowledgeElement(
        'Which standards should be enforced for password creation?',
        'Issue',
        'i'
      );
      const alternative = await createDecisionKnowledgeElement(
        'A password should have at least 8 characters!',
        'Alternative',
        'i',
        issue2.id,
        'i'
      );

      const updatePayload = Object.assign(alternative, {
        type: 'Decision',
        status: 'decided',
      });
      await updateDecisionKnowledgeElement(0, null, updatePayload);
      const alternativeAfterUpdate = await getSpecificKnowledgeElement(
        alternative.id,
        'i'
      );
      const issue2AfterUpdate = await getSpecificKnowledgeElement(
        issue2.id,
        'i'
      );
      chai.expect(alternativeAfterUpdate.status).to.eql('decided'); // this currently fails, the decision has the status 'idea'
      chai.expect(alternativeAfterUpdate.type).to.eql('Decision');
      chai.expect(issue2AfterUpdate.status).to.eql('resolved');
    }
  );
  // Seems like this rule isn't implemented yet...
  xit(
    '(R5) If the documentation location of a decision knowledge element in the description or a ' +
      'comment of a Jira issue is changed to "Jira issue", a new Jira issue is created. ' +
      'The part of text/sentence in the description or comment is not removed (CONDEC-170, R7).',
    async () => {
      const issue = await createDecisionKnowledgeElement(
        'Which CSS style should be used?',
        'Issue',
        'i'
      );
      const decision = await createDecisionKnowledgeElement(
        'Use SCSS (sassy CSS)!',
        'Decision',
        's',
        issue.id,
        issue.documentationLocation
      );
      const updatePayload = Object.assign(decision, {
        documentationLocation: 'i',
      });
      await updateDecisionKnowledgeElement(0, null, updatePayload);
    }
  );

  // This will be tested in the test cases for CONDEC-123
  xit(
    '(R6) If the decision knowledge element is documented in the description or a comment of a Jira' +
      ' issue, the respective description or comment is updated and also the database entry' +
      ' and the node in the knowledge graph (CONDEC-123).'
  );
  // This will be tested in the test cases for CONDEC-123
  xit(
    '(R7) Decision knowledge elements documented in the description or a comment of a ' +
      'Jira issue can be changed to "irrelevant". Then, their knowledge type is changed' +
      ' to "other" and the tags/annotations are removed (CONDEC-123).'
  );
  xit(
    '(R8) A Jira issue (i.e. a decision knowledge element documented as an entire Jira issue)' +
      ' can only be changed in a view on the knowledge graph if the user has the rights to change ' +
      'Jira issues (CONDEC-852, integrity).'
  );
  xit('(R9) If the webhook is activated, it will be fired (CONDEC-185).');
  it(
    '(E1) Decision knowledge element with given id and documentation location ' +
      'does not exist in database.',
    async () => {
      const issue = createDecisionKnowledgeElement('Dummy issue', 'Issue', 'i');
      const updatePayload = Object.assign(issue, { id: -1 });
      try {
        await updateDecisionKnowledgeElement(0, null, updatePayload);
      } catch (err) {
        chai.expect(err.message).to.eql('Request failed with status code 404');
      }
    }
  );
  xit('(E2) The user does not have the rights for changing.');
});
