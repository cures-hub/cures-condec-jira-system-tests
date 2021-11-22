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
  deleteDecisionKnowledgeElement,
} = require('./helpers.js');

const { defaultIssueType } = require('../config.json');
// chai-like provides the 'like' function, which searches for an object's subset
chai.use(require('chai-like'));
// chai-things allows us to use 'something' syntax to access array elements without knowing their indices
chai.use(require('chai-things'));
/**
 * @issue How should test cases for SF rules and exceptions be specified?
 *
 * @alternative Specify test cases for all rules and exceptions, including those
 * that will not be tested!
 * @pro Test cases can easily be implemented later
 * @con Test files grow in size, leading to poor readability
 *
 * @decision Specify only test cases for rules and exceptions that will be
 * tested!
 * @pro Code is concise and easy to read
 * @con Not all rules/exceptions end up in the system test code. It can be hard to
 * find them later.
 *
 * @alternative Disable test cases that will not be implemented using `xit`
 * @pro Test cases that are disabled don't show up in junit reports
 *
 * @issue Which naming convention should system test cases (it blocks) follow?
 * @alternative Test cases should be named using the exact text of the
 * rule/exception they test!
 * @con If the text of the rule/exception changes, it will be hard to find the test case again
 * @con This is hard to read
 *
 * @decision Test cases should be named using a short version of the
 * rule/exception text, using should/when syntax and the rule number
 * (example: should remove knowledge elements from issue description
 * and comments from the database when a Jira issue is deleted (R2))
 * @pro It is easy to understand which assertions will be made
 * @con This is still a long syntax
 *
 * @alternative Describe blocks should be named TCS: <issue-key of SF to test>
 * @pro It is easy to find the requirement associated with a test in Jira
 * @con It is not obvious which system function is being tested, unless you know
 * the issue key
 *
 * @decision  Describe blocks should be named TCS: Test <name of SF to test>
 * @pro It is obvious which functionality is tested
 */

/**
 * CONDEC-170: Delete knowledge element
 */
describe('TCS: Test delete knowledge element', () => {
  before(async () => {
    await setUpJira();
  });

  /**
   * TCS: Test delete knowledge element should remove knowledge elements from issue description and comments from the database when a Jira issue is deleted (R2)
   *
   * System function: Delete knowledge elements
   * Precondition system: A Jira issue exists with knowledge elements in its description and comments
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete the Jira issue
   * Expected result on GUI: Knowledge from the issue is not visible anymore
   * Expected exception: None
   * Postcondition system: The issue is deleted as well as knowledge from its comments and description
   */
  it('should remove knowledge elements from issue description and comments from the database when a Jira issue is deleted (R2)', async () => {
    const issue = await createJiraIssue(
      defaultIssueType,
      'Develop strategy for maximizing joy',
      '{issue}Which method of transportation to use?{issue}\n{alternative}Use a bicycle!{alternative}'
    );
    await createDecisionKnowledgeElement('Use a tricycle!', 'Decision', 's', issue.id, 'i');

    await jira.deleteIssue(issue.id);

    const knowledgeElements = await getKnowledgeElements();
    chai.expect(knowledgeElements).to.not.contain.something.that.has.property('summary', 'Use a bicycle!');
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property('summary', 'Which method of transportation to use?');

    chai.expect(knowledgeElements).to.not.contain.something.that.has.property('summary', 'Use a tricycle!');
  });

  /**
   * TCS: Test delete knowledge element should delete the knowledge element representing a Jira issue from the graph when the Jira issue is deleted (R3)
   *
   * System function: Delete knowledge element
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete the Jira issue
   * Expected result on GUI: The issue is not visible in the knowledge graph
   * Expected exception: None
   * Postcondition system: The Jira issue is no longer stored as decision knowledge
   */
  it('should delete the knowledge element representing a Jira issue from the graph when the Jira issue is deleted (R3)', async () => {
    const issue = await createJiraIssue(
      defaultIssueType,
      'Develop strategy for fast and cost-effective pizza delivery'
    );
    await jira.deleteIssue(issue.id);

    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property(
        'summary',
        'Develop strategy for fast and cost-effective pizza delivery'
      );
  });

  /**
   * TCS: Test delete knowledge element should delete all decision knowledge from the database that was in the body of a Jira issue comment when the comment is deleted (R4)
   *
   * System function: Delete knowledge element
   * Precondition system: Jira issue exists with a comment containing decision knowledge
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
     1. Delete the comment
   * Expected result on GUI: The decision knowledge from the comment is no longer visible in the graph
   * Expected exception: None
   * Postcondition system: The decision knowledge elements from the comment have been deleted
   */
  it('should delete all decision knowledge from the database that was in the body of a Jira issue comment when the comment is deleted (R4)', async () => {
    // Precondition: Jira issue exists with a comment containing decision knowledge
    const createdIssue = await createJiraIssue(defaultIssueType, 'Plan the tasks from June until October');
    const addedComment = await jira.addComment(
      createdIssue.key,
      '{issue}Which language should we use to define tasks?{issue}'
    );
    await axios.delete(
      `${JSONConfig.fullUrl}/rest/api/2/issue/${createdIssue.key}/comment/${addedComment.id}`,
      localCredentialsObject
    );
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.with.property('summary', 'Which language should we use to define tasks?');
  });

  /**
   * TCS: Test delete knowledge element should delete a knowledge element from the database when it is removed from the description of a Jira issue (R5)
   * 
   * System function: Delete knowledge element
   * Precondition system: A Jira issue exists with decision knowledge in its description
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete the decision knowledge element from the description of the Jira issue by editing the issue description
   * Expected result on GUI: The decision knowledge element is no longer visible on the knowledge graph
   * Expected exception: None
   * Postcondition system: The element is no longer stored in the ConDec database
   */

  it('should delete a knowledge element from the database when it is removed from the description of a Jira issue (R5)', async () => {
    const issue = await createJiraIssue(
      defaultIssueType,
      'Buy mugs for serving coffee',
      '(!) How large to make the mugs?'
    );

    await jira.updateIssue(issue.id, {
      update: { description: [{ set: 'foo' }] },
    });
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property('description', 'How large to make the mugs?');
  });

  /**
   * TCS: Test delete knowledge element should delete a knowledge element from
   *    the database and knowledge graph when deletion is triggered in a view on
   *    the knowledge graph (R6)
   *
   * System function: Delete knowledge element
   * Precondition system: A decision knowledge element exists
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete decision knowledge element in a view on the knowledge graph (= call the deleteDecisionKnowledgeElement REST endpoint)
   * Expected result on GUI: The knowledge element is no longer visible on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The deleted element no longer exists in the database
   */
  it('should delete a knowledge element from the database when deletion is triggered in a view on the knowledge graph (R6)', async () => {
    // Precondition: Decision knowledge element exists
    const jiraIssue = await createJiraIssue(defaultIssueType, 'Order coffee from suppliers');
    const knowledgeElement = await createDecisionKnowledgeElement(
      'Which suppliers should be contacted?',
      'Issue',
      's',
      jiraIssue.id,
      'i'
    );
    await deleteDecisionKnowledgeElement(knowledgeElement.id, 's');

    const knowledgeElementsInDatabase = await getKnowledgeElements();
    chai.expect(knowledgeElementsInDatabase).to.not.contain.something.that.has.property('id', knowledgeElement.id);
  });

  /**
   * TCS: Test delete knowledge element should not remove knowledge element from comment when it is deleted via a view on the knowledge graph (R7)
   *
   * System function: Delete knowledge element
   * Precondition system: Jira issue exists with decision knowledge in its comment
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Delete the decision knowledge element via a view on the knowledge graph (= call the deleteDecisionKnowledgeElement REST endpoint)
   * Expected result on GUI: The comment still contains the knowledge element. The element is no longer visible on the knowledge graph.
   * Expected exception: None
   * Postcondition system: Element is removed from knowledge graph and database. Element still exists in its original documentation location
   */
  it('should not remove knowledge element from comment when it is deleted via a view on the knowledge graph (R7)', async () => {
    // Precondition: Jira issue exists with decision knowledge in its description or comment
    const jiraIssue = await createJiraIssue(defaultIssueType, 'Set up eBay storefront for the Moo company');
    const knowledgeElement = await createDecisionKnowledgeElement(
      "Accept only currencies we don't have to pay fees for!",
      'Issue',
      's', // this issue will be created in a comment
      jiraIssue.id,
      'i'
    );
    await deleteDecisionKnowledgeElement(knowledgeElement.id, 's');

    const jiraIssueAfterKnowledgeDeletion = await jira.findIssue(jiraIssue.key);
    chai
      .expect(jiraIssueAfterKnowledgeDeletion.fields.comment.comments[0].body)
      .to.eql("{issue}Accept only currencies we don't have to pay fees for! {issue}");
  });

  /**
   * TCS: Test delete knowledge element should not allow a nonexistent element
   * to be deleted (E1)
   *
   * System function: Delete knowledge element
   * Precondition system: none
   * Precondition GUI: WS1.3 or WS1.4
   * Test steps:
      1. Trigger deletion of element with id -1 (this id does not exist)
   * Expected result on GUI: -- (Triggering this exception is not possible on the GUI)
   * Expected exception: A 500 error occurs with message: "Deletion of decision knowledge element failed"
   * Postcondition system: Nothing changed
   */
  it('should not allow a nonexistent element to be deleted (E1)', async () => {
    const result = await deleteDecisionKnowledgeElement(-1, 's');

    chai.expect(result.response.status).to.equal(500);
    chai.expect(result.response.data.error).to.include('Deletion of decision knowledge element failed.');
  });
});
