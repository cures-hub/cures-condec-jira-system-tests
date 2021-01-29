const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  createDecisionKnowledgeElement,
  getKnowledgeElements,
  updateDecisionKnowledgeElement,
  getSpecificKnowledgeElement,
} = require('./helpers.js');

const { defaultIssueType } = require('../config.json');

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
   * System function: Change decision knowledge element
   * Precondition system: A decision knowledge element with type "Alternative" exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Update the alternative to have type "Decision"
   * Expected result on GUI: The updated element is shown with the decision icon and black text. A success message is shown.
   * Expected exception: None
   * Postcondition system: The alternative changed to a decision with status decided
   */
  it('should change the status to "decided" when an alternative is changed to a decision (R1)', async () => {
    const jiraTask = await createJiraIssue(defaultIssueType, 'Enable persistence of user data');

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
    chai.expect(decisionKnowledgeAfterChange).to.be.an('Array').that.contains.something.like({
      id: alternative.id,
      type: 'Decision',
      status: 'decided',
    });
  });

  /**
   * TCS: Test change decision knowledge element should change the decision's status to 'rejected' when a user tries to change it to an alternative
   *
   * System function: Change decision knowledge element
   * Precondition system: A decision knowledge element exists with type decision
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Try to update the decision by changing its knowledge type to 'Alternative'
   * Expected result on GUI: The decision has gray text on the treant view and red text on the graph and treeviewer views. A success message is shown.
   * Expected exception: None
   * Postcondition system: The updated knowledge element still has type 'Decision' and its new status is 'rejected'
   *
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
    const updatedKnowledgeElement = await getSpecificKnowledgeElement(knowledgElement.id, 'i');
    chai.expect(updatedKnowledgeElement).to.be.like({
      id: knowledgElement.id,
      type: 'Decision',
      status: 'rejected',
    });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "unresolved" when the linked decision changes status to "challenged" and there is no other "decided" decision linked (R3)
   *
   * System function: Change decision knowledge element
   * Precondition system: Decision knowledge element of type issue exists with linked element of type decision
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Update the decision's status to "challenged"
   * Expected result on GUI: The issue and the decision both have gray text on the treant view, and red text on the graph and treeviewer views.
   * Expected exception: none
   * Postcondition system: The issue has status "unresolved"
   */
  it('should change the status of an issue to "unresolved" when the linked decision changes status to "challenged" and there is no other "decided" decision linked (R3)', async () => {
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
    chai.expect(issue1AfterUpdate).to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "unresolved" when the linked decision changes status to "rejected" and there is no other "decided" decision linked (R3)
   *
   * System function: Change decision knowledge element
   * Precondition system: A Jira issue exists with a linked decision element and no other linked decision element
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Update the decision's status to "rejected"
   * Expected result on GUI: the decision is displayed with gray text
   * Expected exception: none
   * Postcondition system: The issue has status "unresolved"
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
    chai.expect(issueAfterUpdate).to.be.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "resolved" when a linked decision is set to status "decided" (R4)
   *
   * System function: Change decision knowledge element
   * Precondition system: A decision knowledge issue exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Add a decision element (this has the status "decided" by default)
   * Expected result on GUI: The added decision is visible
   * Expected exception: none
   * Postcondition system: The decision knowledge issue has the status "resolved"
   */
  it('should change the status of an issue to "resolved" when a linked decision is set to status "decided" (R4)', async () => {
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
    const issueAfterAddingDecision = await getSpecificKnowledgeElement(issue.id, 'i');
    chai.expect(decision.status).to.eql('decided');
    chai.expect(issueAfterAddingDecision.status).to.eql('resolved');
  });

  /**
   * TCS: Test change decision knowledge element should change the status of an issue to "resolved" when a linked alternative is changed to a decision with the status "decided" (R4)
   *
   * System function: Change decision knowledge element
   * Precondition system: A decision knowledge issue exists with a linked alternative
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Update the Alternative to have type decision with status "decided"
   * Expected result on GUI: The element that was previously an alternative is now a decision and has the corresponding icon and color
   * Expected exception: none
   * Postcondition system: The alternative has changed to a decision, and has status "decided". The issue has the status "resolved"
   */
  // Failing on ConDec v2.2.9 -> see CONDEC-892
  it('should change the status of an issue to "resolved" when a linked alternative is changed to a decision with the status "decided" (R4)', async () => {
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
    const alternativeAfterUpdate = await getSpecificKnowledgeElement(alternative.id, 'i');
    const issueAfterUpdate = await getSpecificKnowledgeElement(issue.id, 'i');

    chai.expect(alternativeAfterUpdate.status).to.eql('decided');
    chai.expect(alternativeAfterUpdate.type).to.eql('Decision');
    chai.expect(issueAfterUpdate.status).to.eql('resolved');
  });

  /**
   * TCS: Test change decision knowledge element should not allow a decision knowledge element with invalid id to be updated (E1)
   *
   * System function: Change decision knowledge element
   * Precondition system: none
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Attempt to trigger update of an element with an invalid id
   * Expected result on GUI: nothing changed
   * Expected exception: 404 error
   * Postcondition system: Nothing changed
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
