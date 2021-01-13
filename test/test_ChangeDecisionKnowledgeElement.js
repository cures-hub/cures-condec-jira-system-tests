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
/**
 * CONDEC-169: Change decision knowledge element
 */
describe('TCS: Test change decision knowledge element', () => {
  before(async () => {
    await setUpJira(true); // These tests need the Jira issue strategy, so we explicitly set it here
  });

  /**
   * TCS: Test change decision knowledge element should change the status to "decided" when an alternative is changed to a decision (R1)
   *
   * Precondition: Decision knowledge element with type "Alternative" exists
   *
   * Step 1: Update the alternative to have type "Decision"
   *
   * Step 2: Verify that the alternative changed to a decision with status decided
   *
   * Postcondition: The alternative changed to a decision with status decided
   *
   */
  it('should change the status to "decided" when an alternative is changed to a decision (R1)', async () => {
    // Precondition: Decision knowledge element with type "Alternative" exists
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

    // Step 1: Update the alternative to have type "Decision"
    const updatedAlternative = Object.assign(alternative, { type: 'Decision' });
    await updateDecisionKnowledgeElement(issue.id, 'i', updatedAlternative);

    // Step 2: Verify that the alternative changed to a decision with status decided
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
   * TCS: Test change decision knowledge element should change the decision's status to 'rejected' when a user tries to change it to an alternative
   *
   * Precondition: A decision knowledge element exists with type 'Decision'
   *
   * Step 1: Try to update the decision by changing its knowledge type to 'Alternative'
   *
   * Step 2: Verify that the knowledge element has type 'Decision' and status 'rejected'
   *
   * Postcondition: The knowledge element has type 'Decision' and status 'rejected'
   *
   */
  it('should change the decision\'s status to "rejected" when a user tries to change it to an alternative (R2)', async () => {
    // Precondition: A decision knowledge element exists with type 'Decision'
    const knowledgElement = await createDecisionKnowledgeElement(
      'Only users with admin rights should be able to set the toggle!',
      'Decision',
      'i'
    );
    // Step 1: Try to update the decision by changing its knowledge type to 'Alternative'
    const updatePayload = Object.assign(knowledgElement, {
      type: 'Alternative',
    });

    await updateDecisionKnowledgeElement(0, null, updatePayload);

    // Step 2: Verify that the knowledge element has type 'Decision' and status 'rejected'
    const updatedKnowledgeElement = await getSpecificKnowledgeElement(
      knowledgElement.id,
      'i'
    );
    chai.expect(updatedKnowledgeElement).to.be.like({
      id: knowledgElement.id,
      type: 'Decision',
      status: 'rejected',
    });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "unresolved" when the linked decision changes status to "challenged" and there is no other "decided" decision linked (R3)
   *
   * Precondition: A Jira issue exists with a linked Decision element and no other linked decision element
   *
   * Step 1: Update the decision's status to "challenged"
   *
   * Step 2: Verify that the issue has status "unresolved"
   *
   * Postcondition: The issue has status "unresolved"
   *
   */
  it('should change the status of an issue to "unresolved" when the linked decision changes status to "challenged" and there is no other "decided" decision linked (R3)', async () => {
    // Precondition: Decision knowledge Issue exists with linked decision
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

    // Step 1: Update the decision's status to "challenged"
    const updatePayload = Object.assign(decision, { status: 'challenged' });
    await updateDecisionKnowledgeElement(0, null, updatePayload);

    // Step 2: Verify that the issue has status "unresolved"
    const issue1AfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');
    chai
      .expect(issue1AfterUpdate)
      .to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "unresolved" when the linked decision changes status to "rejected" and there is no other "decided" decision linked (R3)
   *
   * Precondition: A Jira issue exists with a linked decision element and no other linked decision element
   *
   * Step 1: Update the decision's status to "rejected"
   *
   * Step 2: Verify that the issue has status "unresolved"
   *
   * Postcondition: The issue has status "unresolved"
   *
   */
  it('should change the status of an issue to "unresolved" when the linked decision changes status to "rejected" and there is no other "decided" decision linked (R3)', async () => {
    // Precondition: A Jira issue exists with a linked decision element and no other linked decision element
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
    // Step 1: Update the decision's status to "rejected"
    const updatePayload = Object.assign(decision, { status: 'rejected' });
    await updateDecisionKnowledgeElement(0, null, updatePayload);
    // Step 2: Verify that the issue has status "unresolved"
    const issueAfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');
    chai
      .expect(issueAfterUpdate)
      .to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "resolved" when a linked decision is set to status "decided" (R4)
   *
   * Precondition: A decision knowledge issue exists
   *
   * Step 1: Add a decision element (this has the status "decided" by default)
   *
   * Step 2: Verify that the decision knowledge issue has the status "resolved"
   *
   * Postcondition: The decision knowledge issue has the status "resolved"
   *
   */
  it('should change the status of an issue to "resolved" when a linked decision is set to status "decided" (R4)', async () => {
    // Precondition: A decision knowledge issue exists
    const issue = await createDecisionKnowledgeElement(
      'Which options should be available for setting font size?',
      'Issue',
      'i'
    );
    // Step 1: Add a decision element (this has the status "decided" by default)
    const decision = await createDecisionKnowledgeElement(
      'Options for small, medium, and large should be available!',
      'Decision',
      'i',
      issue.id,
      'i'
    );
    // Step 2: Verify that the decision knowledge issue has the status "resolved"
    const issueAfterAddingDecision = await getSpecificKnowledgeElement(
      issue.id,
      'i'
    );
    chai.expect(decision.status).to.eql('decided');
    chai.expect(issueAfterAddingDecision.status).to.eql('resolved');
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "resolved" when a linked alternative is changed to a decision with the status "decided" (R4)
   *
   * Precondition: A decision knowledge issue exists with a linked alternative
   *
   * Step 1: Update the Alternative to have type decision with status "decided"
   *
   * Step 2: Verify that the alternative has changed to a decision, and has status "decided". Verify that the issue has the status "resolved"
   *
   * Postcondition: The alternative has changed to a decision, and has status "decided". The issue has the status "resolved"
   *
   */
  it('should change the status of an issue to "resolved" when a linked alternative is changed to a decision with the status "decided" (R4)', async () => {
    // Precondition: A decision knowledge issue exists with a linked alternative
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
    // Step 1: Update the Alternative to have type decision with status "decided"
    const updatePayload = Object.assign(alternative, {
      type: 'Decision',
      status: 'decided',
    });
    await updateDecisionKnowledgeElement(0, null, updatePayload);
    // Step 2: Verify that the alternative has changed to a decision, and has
    // status "decided". Verify that the issue has the status "resolved"
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
   * Precondition: none
   *
   * Step 1: Attempt to trigger update of an element with an invalid id
   *
   * Step 2: Verify that this results in a 404 error.
   *
   * Postcondition: Nothing changed, the request results in a 404 error
   *
   */
  it('should not allow a decision knowledge element with invalid id to be updated (E1)', async () => {
    // Step 1: Attempt to trigger update of an element with an invalid id
    const issue = createDecisionKnowledgeElement('Dummy issue', 'Issue', 'i');
    const updatePayload = Object.assign(issue, { id: -1 });
    try {
      await updateDecisionKnowledgeElement(0, null, updatePayload);
    } catch (err) {
      // Step 2: Verify that this results in a 404 error
      chai.expect(err.message).to.eql('Request failed with status code 404');
    }
  });
});
