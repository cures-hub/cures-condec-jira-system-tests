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

describe.only('TCS: Test change decision knowledge element', () => {
  before(async () => {
    await setUpJira(true); // These tests need the Jira issue strategy, so we explicitly set it here
  });

  /**
   * TCS: Test change decision knowledge element should change the status to "decided" when an alternative is changed to a decision (R1)
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should change the status to "decided" when an alternative is changed to a decision (R1)', async () => {
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

  /**
   * TCS: Test change decision knowledge element
   *
   * Precondition: A decision knowledge element exists with type 'Decision'
   *
   * Postcondition: The knowledge element has type 'Decision' and status 'rejected'.
   *
   */
  it("should change the decision's status to 'rejected' when a user tries to change it to an alternative", async () => {
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
  });

  /**
   * TCS: Test change decision knowledge element
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should change the status of an issue to "unresolved" when the linked decision changes status to "challenged" and there is no other "decided" decision linked (R3)', async () => {
    // First part: check for status 'challenged'
    const issue = await createDecisionKnowledgeElement(
      'Which font should be used in the user interface?',
      'Issue',
      'i'
    );
    const decision = await createDecisionKnowledgeElement(
      'Use Wingdings for the user interface font!',
      'Decision',
      'i',
      issue.id,
      'i'
    );
    const updatePayload = Object.assign(decision, { status: 'challenged' });
    await updateDecisionKnowledgeElement(0, null, updatePayload);

    const issue1AfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');
    chai
      .expect(issue1AfterUpdate)
      .to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should change the status of an issue to "unresolved" when the linked decision changes status to "rejected" and there is no other "decided" decision linked (R3)', async () => {
    const issue = await createDecisionKnowledgeElement(
      'Which color scheme should be used for the website?',
      'Issue',
      'i'
    );
    const decision = await createDecisionKnowledgeElement(
      'Use a dark color scheme for the website!',
      'Decision',
      'i',
      issue.id,
      'i'
    );
    const updatePayload = Object.assign(decision, { status: 'rejected' });
    await updateDecisionKnowledgeElement(0, null, updatePayload);

    const issueAfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');
    chai
      .expect(issueAfterUpdate)
      .to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should change the status of an issue to "resolved" when a linked decision is set to status "decided" (R4)', async () => {
    // Case one: decision has status decided when linked to an issue
    const issue = await createDecisionKnowledgeElement(
      'Which options should be available for setting font size?',
      'Issue',
      'i'
    );
    const decision = await createDecisionKnowledgeElement(
      'Options for small, medium, and large should be available!',
      'Decision',
      'i',
      issue.id,
      'i'
    );
    const issueAfterAddingDecision = await getSpecificKnowledgeElement(
      issue.id,
      'i'
    );
    chai.expect(decision.status).to.eql('decided');
    chai.expect(issueAfterAddingDecision.status).to.eql('resolved');
  });

  /**
   * TCS: Test change decision knowledge element
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should change the status of an issue to "resolved" when a linked alternative is changed to a decision (R4)', async () => {
    const issue = await createDecisionKnowledgeElement(
      'Which standards should be enforced for password creation?',
      'Issue',
      'i'
    );
    const alternative = await createDecisionKnowledgeElement(
      'A password should have at least 8 characters!',
      'Alternative',
      'i',
      issue.id,
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
    const issueAfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');
    chai.expect(alternativeAfterUpdate.status).to.eql('decided'); // this currently fails, the decision has the status 'idea'
    chai.expect(alternativeAfterUpdate.type).to.eql('Decision');
    chai.expect(issueAfterUpdate.status).to.eql('resolved');
  });

  /**
   * TCS: Test change decision knowledge element should open a Jira issue when the documentation location of a decision knowledge element changes from Jira issue text to Jira issue (R5)
   *
   * Precondition: Decision knowledge element exists in the comment of a Jira issue
   *
   * Step 1: Update the documentation location of the element from Jira issue
   *    text ('s') to Jira issue ('i')
   *
   * Step 2: Verify that there is a new Jira representing the converted decision
   *    knowledge element
   *
   * Postcondition: New Jira issue exists and represents the converted decision
   *    knowledge element. The comment containing the decision knowledge element
   *    has not changed
   *
   */
  // Seems like this rule isn't implemented yet...
  xit('should open a Jira issue when the documentation location of a decision knowledge element changes from Jira issue text to Jira issue (R5)', async () => {
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

    // TODO: implement the rest
  });

  /**
   * TCS: Test change decision knowledge element should not allow a decision knowledge element with invalid id to be updated (E1)
   *
   * Precondition:
   *
   * Postcondition:
   *
   */
  it('should not allow a decision knowledge element with invalid id to be updated (E1)', async () => {
    const issue = createDecisionKnowledgeElement('Dummy issue', 'Issue', 'i');
    const updatePayload = Object.assign(issue, { id: -1 });
    try {
      await updateDecisionKnowledgeElement(0, null, updatePayload);
    } catch (err) {
      chai.expect(err.message).to.eql('Request failed with status code 404');
    }
  });
});
