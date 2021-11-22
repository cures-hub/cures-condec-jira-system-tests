const axios = require('axios');
const chai = require('chai');
const JSONConfig = require('../config.json');
const {
  jira,
  setUpJira,
  createJiraIssue,
  localCredentialsObject,
  getKnowledgeElements,
  createDecisionKnowledgeElement,
  createLink,
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
   * System function: Link knowledge elements
   * Precondition system: Two decision knowledge elements exist as Jira issues
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Create a link of type "relates" between the two elements via the ConDec interface
   * Expected result on GUI: The new link is visible on the knowledge graph. A success message is displayed.
   * Expected exception: None
   * Postcondition system: A new Jira issue link was created with type "relates"
   */
  it('should create a Jira issue link when both the source and destination elements are Jira issues (R1)', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');
    chai.expect(parseInt(issue1.id)).to.be.greaterThan(0);
    chai.expect(parseInt(issue2.id)).to.be.greaterThan(0);

    const link = await createLink(issue1.id, 'i', issue2.id, 'i');

    const issue1Links = await jira.findIssue(issue1.id);
    const issue2Links = await jira.findIssue(issue2.id);

    chai.expect(issue1Links.fields.issuelinks[0]).to.have.deep.property('id', `${link.data.id}`);
    chai.expect(issue1Links.fields.issuelinks[0].type).to.have.property('name', 'Relates');
    chai.expect(issue1Links.fields.issuelinks[0].outwardIssue).to.have.property('id', `${issue2.id}`);
    chai.expect(issue1Links.fields.issuelinks[0].outwardIssue).to.have.property('key', `${issue2.key}`);

    chai.expect(issue2Links.fields.issuelinks[0]).to.have.deep.property('id', `${link.data.id}`);
    chai.expect(issue2Links.fields.issuelinks[0].type).to.have.property('name', 'Relates');
    chai.expect(issue2Links.fields.issuelinks[0].inwardIssue).to.have.property('id', `${issue1.id}`);
    chai.expect(issue2Links.fields.issuelinks[0].inwardIssue).to.have.property('key', `${issue1.key}`);
  });

  /**
   * TCS: Test link knowledge elements should store the link between elements with documentation location "i" and documentation location "s" in the ConDec database, not a Jira issue link (R2)
   *
   * System function: Link knowledge elements
   * Precondition system: Two decision knowledge elements exist, one with documentation location Jira issue (="i") and the other with documentation location Jira issue text (="s")
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
     1. Create a link between the two decision knowledge elements via the ConDec interface
   * Expected result on GUI: The link is shown on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The knowledge element stored in the Jira issue does not have any new Jira issue links. The created link is stored in the ConDec database.
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
    chai.expect(decisionKnowledgeComment.key).to.contain(decisionKnowledgeIssue.key);
  });

  /**
   * TCS: Test link knowledge elements should not allow an element with documentation location "i" to be linked to itself (R3)
   *
   * System function: Link knowledge elements
   * Precondition system: A decision knowledge element exists as a Jira issue
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
   *   1. Attempt to create a ConDec link between the decision knowledge element and itself
   * Expected result on GUI: No link is created
   * Expected exception: An error message appears
   * Postcondition system: Nothing changed
   */
  it('should not allow an element with documentation location "i" to be linked to itself (R3)', async () => {
    const alternative = await createJiraIssue('Alternative', 'Dummy Alternative');

    // Link the alternative to itself
    try {
      createLink(alternative.id, 'i', alternative.id, 'i');
    } catch (err) {
      chai.expect(err.message).to.eql('Request failed with status code 400');
    }
  });

  /**
   * TCS: Test link knowledge elements should set the status of an issue to "resolved" when it is linked to a decision with status "decided" (R4)
   *
   * System function: Link knowledge elements
   * Precondition system: Decision knowledge issue exists
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
       1. Create a decision as a child of the issue element
   * Expected result on GUI: The decision is linked to the issue element
   * Expected exception: None
   * Postcondition system: The decision knowledge issue has status "resolved"
   */
  it('should set the status of an issue to "resolved" when it is linked to a decision with status "decided" (R4)', async () => {
    const issue1 = await createJiraIssue('Issue', 'Which board games should be played?');
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
   * System function: Link knowledge elements
   * Precondition system: A decision knowledge element exists
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
   *    1. Trigger link creation between the existing element and element with the id -1 (on the GUI leave the target element empty and click "Link element")
   * Expected result on GUI: An error message should appear with the message: Link could not be created due to a bad request.
   * Expected exception: A 400 error occurs
   * Postcondition system: nothing changed
   */
  it('should not allow an element that does not exist in the database to be linked (E1)', async () => {
    const issue = await createDecisionKnowledgeElement('Dummy issue', 'Issue', 'i');
    
    try {
      createLink(issue.id, 'i', -1, 'i'); // id -1 does not exist
    } catch (err) {
      chai.expect(err.message).to.eql('Request failed with status code 400');
    }
  });
});
