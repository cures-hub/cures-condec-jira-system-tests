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

chai.use(require('chai-like'));
chai.use(require('chai-things'));

/**
 * CONDEC-171: Link knowledge elements
 */
describe('TCS: Test link knowledge elements', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });

  /**
   * TCS: Test link knowledge elements should create a Jira issue link when both the source and destination elements are Jira issues (R1)
   *
   * Precondition: Two decision knowledge elements exist as Jira issues
   *
   * Step 1: Create a ConDec link of type "relates" between the two elements
   *
   * Step 2: Verify that a new link was created with type "relates"
   *
   * Postcondition: A new link with the given type was created
   */
  it('should create a Jira issue link when both the source and destination elements are Jira issues (R1)', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    const link = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
        `?projectKey=${JSONConfig.projectKey}` +
        '&documentationLocationOfParent=i' +
        '&documentationLocationOfChild=i' +
        `&idOfParent=${issue1.id}` +
        `&idOfChild=${issue2.id}` +
        '&linkTypeName=relates',
      undefined,
      localCredentialsObject
    );

    const issue1Links = await jira.findIssue(issue1.id);
    const issue2Links = await jira.findIssue(issue2.id);

    chai
      .expect(issue1Links.fields.issuelinks[0])
      .to.have.deep.property('id', `${link.data.id}`);
    chai
      .expect(issue1Links.fields.issuelinks[0].type)
      .to.have.property('name', 'Relates');
    chai
      .expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('id', `${issue2.id}`);
    chai
      .expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('key', `${issue2.key}`);

    chai
      .expect(issue2Links.fields.issuelinks[0])
      .to.have.deep.property('id', `${link.data.id}`);
    chai
      .expect(issue2Links.fields.issuelinks[0].type)
      .to.have.property('name', 'Relates');
    chai
      .expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('id', `${issue1.id}`);
    chai
      .expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('key', `${issue1.key}`);
  });

  /**
   * TCS: Test link knowledge elements should store the link between elements with documentation location "i" and documentation location "s" in the ConDec database, not a Jira issue link (R2)
   *
   * Precondition: Two decision knowledge elements exist, one with documentation
   * location "i" and the other with documentation location "s"
   *
   * Step 1: Create a ConDec link between the two elements
   *
   * Step 2: Verify that no Jira link was created and that the ConDec link is
   * stored in the ConDec database
   *
   * Postcondition: No Jira link was created and that the ConDec link is
   * stored in the ConDec database
   */
  it('should store the link between elements with documentation location "i" and documentation location "s" in the ConDec database, not a Jira issue link (R2)', async () => {
    const decisionKnowledgeIssue = await createDecisionKnowledgeElement(
      'Which method of transportation should be used for pizza delivery?',
      'Issue',
      'i'
    );
    const decisionKnowledgeComment = await createDecisionKnowledgeElement(
      'Use a car to deliver pizzas!',
      'Decision',
      's',
      decisionKnowledgeIssue.id, // The comment gets linked to the Jira issue created above
      'i'
    );
    const jiraIssue = await jira.findIssue(decisionKnowledgeIssue.id);
    // Check that no Jira issue link exists
    chai.expect(jiraIssue.fields.issuelinks).to.be.an('Array').with.lengthOf(0);

    // Check that the comment's key contains the issue key - this means they
    // are linked in the ConDec database
    chai
      .expect(decisionKnowledgeComment.key)
      .to.contain(decisionKnowledgeIssue.key);
  });

  /**
   * TCS: Test link knowledge elements should not allow an element with documentation location "i" to be linked to itself (R3)
   *
   * Precondition: A decision knowledge element exists as a Jira issue
   *
   * Step 1: Attempt to create a ConDec link between the decision knowledge
   * element and itself
   *
   * Step 2: Verify that no link was created and nothing changed
   *
   * Postcondition: Nothing changed; no link was created
   */
  // This is currently failing, as it should not be allowed to link an element
  // to itself
  it('should not allow an element with documentation location "i" to be linked to itself (R3)', async () => {
    const alternative = await createJiraIssue(
      'Alternative',
      'Dummy Alternative'
    );

    // Link the alternative to itself
    const link = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
        `?projectKey=${JSONConfig.projectKey}` +
        `&idOfParent=${alternative.id}` +
        '&documentationLocationOfParent=i' +
        `&idOfChild=${alternative.id}` +
        '&documentationLocationOfChild=i' +
        '&linkTypeName=Relates',
      undefined,
      localCredentialsObject
    );
    chai.expect(link.status).not.to.eql(200);
  });

  /**
   * TCS: Test link knowledge elements should set the status of an issue to "resolved" when it is linked to a decision with status "decided" (R4)
   *
   * Precondition: Decision knowledge issue exists
   *
   * Step 1: Create a decision as a child of the issue element
   *
   * Step 2: Verify that issue has status resolved
   *
   * Postcondition: The decision knowledge issue has status "resolved"
   */
  it('should set the status of an issue to "resolved" when it is linked to a decision with status "decided" (R4)', async () => {
    const issue1 = await createJiraIssue(
      'Issue',
      'Which board games should be played?'
    );
    const decisionElement = await createDecisionKnowledgeElement(
      'Settlers of Catan should be played!',
      'Decision',
      's',
      issue1.id,
      'i'
    );
    chai.expect(decisionElement).to.have.property('status', 'decided'); // sanity check
    const knowledgeElements = await getKnowledgeElements();

    chai
      .expect(knowledgeElements)
      .to.be.an('Array')
      .that.contains.something.like({
        id: Number(issue1.id),
        status: 'resolved',
        summary: 'Which board games should be played?',
      });
  });

  /**
   * TCS: Test link knowledge elements should not allow an element that does not exist in the database to be linked (E1)
   *
   * Precondition: A decision knowledge element exists
   *
   * Step 1: Trigger link creation between the existing element and element with
   * the id -1
   *
   * Step 2: Verify that this does not work
   *
   * Postcondition: Nothing changed
   */
  it('should not allow an element that does not exist in the database to be linked (E1)', async () => {
    const issue = await createDecisionKnowledgeElement(
      'Dummy issue',
      'Issue',
      'i'
    );
    try {
      await axios.post(
        `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
          `?projectKey=${JSONConfig.projectKey}` +
          `&idOfParent=${issue.id}` +
          '&documentationLocationOfParent=i' +
          `&idOfChild=-1` + // id -1 does not exist
          '&documentationLocationOfChild=i' +
          '&linkTypeName=Relates',
        undefined,
        localCredentialsObject
      );
    } catch (err) {
      chai.expect(err.message).to.eql('Request failed with status code 400');
    }
  });
});

// TODO: move this to a separate file
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
   * Precondition: Two decision knowledge elements exist as Jira issues and are
   * linked to each other
   *
   * Step 1: Request the link between the issues to be deleted via the ConDec
   * deleteLink interface
   *
   * Step 2: Verify that the Jira issue link between the elements has been removed
   *
   * Postcondition: The Jira issue link between the elements has been removed
   */
  it('should delete the Jira issue link when both source and target elements of unlinking are Jira issues (R1)', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    // Create a link between issue 1 and issue 2
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
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
      url:
        `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink.json` +
        `?projectKey=${JSONConfig.projectKey}`,
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
    chai
      .expect(searchResult.fields.issuelinks)
      .to.be.an('Array')
      .with.length(0);
  });

  /**
   * TCS: Test unlink knowledge elements should set the status of an issue to "unresolved" when it is unlinked from a "decided" decision and has no other "decided" decisions linked (R3)
   *
   * Precondition: A decision knowledge issue exists and is linked to a decision
   * in status "decided"
   *
   * Step 1: Delete the link between the knowledge issue and the decision
   *
   * Step 2: Verify that the issue now has status "unresolved"
   *
   * Postcondition: The issue's status is "unresolved"
   */
  // This test is currently failing, it seems as if the issue gets deleted and
  // not just unlinked
  it('should set the status of an issue to "unresolved" when it is unlinked from a "decided" decision and has no other "decided" decisions linked (R3)', async () => {
    const issue = await createDecisionKnowledgeElement(
      'Which qualifications should be considered in hiring a new developer?',
      'Issue',
      'i'
    );

    const comment = await createDecisionKnowledgeElement(
      'Consider the amount of experience the candidate has!',
      'Decision',
      's',
      issue.id,
      'i'
    );
    const payload = {
      idOfSourceElement: comment.id,
      idOfDestinationElement: issue.id,
      documentationLocationOfSourceElement: 's',
      documentationLocationOfDestinationElement: 'i',
    };
    const deleteLinkRequest = {
      method: 'delete',
      url:
        `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink.json` +
        `?projectKey=${JSONConfig.projectKey}`,
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };
    const response = await axios.request(deleteLinkRequest);
    chai.expect(response.status).to.eql(200);
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.be.an('Array')
      .that.contains.something.like({ id: issue.id, status: 'unresolved' });
  });

  /**
   * TCS: Test unlink knowledge elements should not allow unlinking of elements with nonexistent ids (E1)
   *
   * Precondition: Two decision knowledge elements exist and are not linked to
   * each other
   *
   * Step 1: Attempt to trigger deletion of the link between the two elements
   *
   * Step 2: Verify that the deletion failed
   *
   * Postcondition: Nothing changed
   */
  it("should not allow unlinking of a link that doesn't exist (E1)", async () => {
    const issue = await createDecisionKnowledgeElement(
      'How should files be organized?',
      'Issue',
      'i'
    );
    // Create a decision that is not linked to the issue
    const decision = await createDecisionKnowledgeElement(
      'Organize files alphabetically!',
      'Decision',
      'i'
    );

    const payload = {
      // THESE ELEMENTS MUST BE PASSED IN THIS ORDER!!
      idOfSourceElement: issue.id,
      idOfDestinationElement: decision.id,
      documentationLocationOfSourceElement: 'i',
      documentationLocationOfDestinationElement: 'i',
    };
    const deleteLinkRequest = {
      method: 'delete',
      url:
        `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink.json` +
        `?projectKey=${JSONConfig.projectKey}`,
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
