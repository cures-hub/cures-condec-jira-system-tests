const axios = require('axios');
const chai = require('chai');
const JSONConfig = require('../config.json');
const {
  jira,
  setUpJira,
  createJiraIssue,
  localCredentialsObject,
  base64LocalCredentials,
  getKnowledgeElements,
  createDecisionKnowledgeElement,
} = require('./helpers.js');

const { defaultIssueType } = require('../config.json');

/**
 * CONDEC-172: Unlink knowledge elements
 */
describe('TCS: Test unlink knowledge elements', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });

  /**
   * TCS: Test unlink knowledge elements should delete the Jira issue link when both source and target elements of unlinking are Jira issues (R1)
   *
   * System function: Unlink knowledge elements
   * Precondition system: Two decision knowledge elements exist as Jira issues and are linked to each other
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
   *   1. Request the link between the elements to be deleted via the ConDec interface (=deleteLink endpoint)
   * Expected result on GUI: The link is not shown in the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The link between the elements has been removed
   */
  it('should delete the Jira issue link when both source and target elements of unlinking are Jira issues (R1)', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    // Create a link between issue 1 and issue 2
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink` +
        `?projectKey=${JSONConfig.projectKey}` +
        '&documentationLocationOfParent=i' +
        '&documentationLocationOfChild=i' +
        `&idOfParent=${issue1.id}` +
        `&idOfChild=${issue2.id}` +
        '&linkTypeName=relates',
      undefined,
      localCredentialsObject
    );

    // Then delete the link
    const payload = {
      // THESE ELEMENTS MUST BE PASSED IN THIS ORDER!!
      idOfSourceElement: issue1.id,
      idOfDestinationElement: issue2.id,
      documentationLocationOfSourceElement: 'i',
      documentationLocationOfDestinationElement: 'i',
    };
    const deleteLinkRequest = {
      method: 'delete',
      url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink?projectKey=${JSONConfig.projectKey}`,
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };
    try {
      // Due to some strangeness with axios, we have to construct the request as above before
      // sending it
      const deleted = await axios(deleteLinkRequest);
      chai.expect(deleted.status).to.eql(200);
    } catch (err) {
      console.error(err);
    }
    const searchResult = await jira.findIssue(issue1.key);
    // Make sure it's really gone
    chai.expect(searchResult.fields.issuelinks).to.be.an('Array').with.length(0);
  });

  /**
   * TCS: Test unlink knowledge elements should set the status of an issue to "unresolved" when it is unlinked from a "decided" decision and has no other "decided" decisions linked (R3)
   *
   * System function: Unlink knowledge elements
   * Precondition system: A decision knowledge issue exists and is linked to a decision with status "decided"
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete the link between the knowledge issue and the decision via the ConDec interface
   * Expected result on GUI: The link is no longer shown. The issue has gray text on the treant view and red text on the treeviewer and graph views.
   * Expected exception: None
   * Postcondition system: The issue's status is "unresolved"
   */
  it('should set the status of an issue to "unresolved" when it is unlinked from a "decided" decision and has no other "decided" decisions linked (R3)', async () => {
    const jiraTask = await createJiraIssue(defaultIssueType, 'Find new team member');

    const issue = await createDecisionKnowledgeElement(
      'Which qualifications should be considered in hiring a new developer?',
      'issue',
      's',
      jiraTask.id,
      'i'
    );
    const decision = await createDecisionKnowledgeElement(
      'Consider the amount of experience the candidate has!',
      'decision',
      's',
      issue.id,
      's'
    );

    const payload = {
      idOfSourceElement: decision.id,
      idOfDestinationElement: issue.id,
      documentationLocationOfSourceElement: 's',
      documentationLocationOfDestinationElement: 's',
      projectKey: JSONConfig.projectKey,
    };
    const deleteLinkRequest = {
      method: 'delete',
      url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink?projectKey=${JSONConfig.projectKey}`,
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };
    const response = await axios.request(deleteLinkRequest);
    chai.expect(response.status).to.eql(200);
    const knowledgeElements = await getKnowledgeElements('', issue.key);
    chai
      .expect(knowledgeElements)
      .to.be.an('Array')
      .that.contains.something.like({ key: issue.key, status: 'unresolved' });
  });

  /**
   * TCS: Test unlink knowledge elements should not allow unlinking of elements with nonexistent ids (E1)
   *
   * System function: Unlink knowledge elements
   * Precondition system: Two decision knowledge elements exist and are not linked to each other
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Attempt to trigger deletion of the link between the two elements (this is only possible via the API, the GUI forbids it)
   * Expected result on GUI: Nothing changed, an error message appears
   * Expected exception: An error is thrown
   * Postcondition system: Nothing changed
   */
  it("should not allow unlinking of a link that doesn't exist (E1)", async () => {
    const issue = await createDecisionKnowledgeElement('How should files be organized?', 'Issue', 'i');
    // Create a decision that is not linked to the issue
    const decision = await createDecisionKnowledgeElement('Organize files alphabetically!', 'Decision', 'i');

    const payload = {
      // THESE ELEMENTS MUST BE PASSED IN THIS ORDER!!
      idOfSourceElement: issue.id,
      idOfDestinationElement: decision.id,
      documentationLocationOfSourceElement: 'i',
      documentationLocationOfDestinationElement: 'i',
    };
    const deleteLinkRequest = {
      method: 'delete',
      url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink?projectKey=${JSONConfig.projectKey}`,
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };
    try {
      await axios(deleteLinkRequest);
    } catch (err) {
      chai.assert(err);
    }
  });
});
