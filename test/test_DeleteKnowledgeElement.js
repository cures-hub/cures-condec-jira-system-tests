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

// chai-like provides the 'like' function, which searches for an object's subset
chai.use(require('chai-like'));
// chai-things allows us to use 'something' syntax to access array elements without knowing their indices
chai.use(require('chai-things'));
/**
 *
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
 * @decision Disable test cases that will not be implemented using `xit`
 * @pro Test cases that are disabled don't show up in junit reports
 *
 * @issue Which naming convention should system test cases (it blocks) follow?
 * @alternative Test cases should be named using the exact text of the
 * rule/exception they test!
 * @con If the text of the rule/exception changes, it will be hard to find the test case again
 *
 * @decision Test cases should be named using a short version of the
 * rule/exception text, using should/when syntax and the rule number
 * (example: should remove knowledge elements from issue description
 * and comments from the database when a Jira issue is deleted (R2))
 * @pro it is easy to understand which assertions will be made
 * @con This is still a long syntax
 *
 * @alternative Describe blocks should be named TCS: <issue-key of SF to test>
 * @pro It is easy to find the requirement associated with a test in Jira
 * @con It is not obvious which system function is being tested, unless you know
 * the issue key
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
   * Precondition: A Jira issue exists with knowledge elements in its
   * description and comments
   *
   * Step 1: Delete the Jira issue
   *
   * Step 2: Verify that the knowledge elements from the Jira issue are not in
   * the ConDec database
   *
   * Postcondition: Knowledge elements from the Jira issue are not in the ConDec
   * database
   */
  it('should remove knowledge elements from issue description and comments from the database when a Jira issue is deleted (R2)', async () => {
    // Precondition: A Jira issue exists with knowledge elements in its description and comments
    const issue = await createJiraIssue(
      'Task',
      'Develop strategy for maximizing joy',
      '{issue}Which method of transportation to use?{issue}\n{alternative}Use a bicycle!{alternative}'
    );
    await createDecisionKnowledgeElement(
      'Use a tricycle!',
      'Decision',
      's',
      issue.id,
      'i'
    );

    // Step 1: Delete the Jira issue
    await jira.deleteIssue(issue.id);

    // Step 2: Verify that the knowledge elements from the Jira issue are not in
    // the ConDec database
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property('summary', 'Use a bicycle!');
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property(
        'summary',
        'Which method of transportation to use?'
      );

    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property('summary', 'Use a tricycle!');
  });

  /**
   * TCS: Test delete knowledge element should delete the knowledge element representing a Jira issue from the graph when the Jira issue is deleted (R3)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Delete the Jira issue
   *
   * Step 2: Verify that the Jira issue is no longer in the ConDec database
   *
   * Postcondition: The Jira issue is no longer in the ConDec database
   */
  it('should delete the knowledge element representing a Jira issue from the graph when the Jira issue is deleted (R3)', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue(
      'Task',
      'Develop strategy for fast and cost-effective pizza delivery'
    );
    // Step 1: Delete the Jira issue
    await jira.deleteIssue(issue.id);

    const knowledgeElements = await getKnowledgeElements();
    // Step 2: Verify that the issue is no longer in the  ConDec database
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
   * Precondition: Jira issue exists with a comment containing decision knowledge
   *
   * Step 1: Delete the comment
   *
   * Step 2: Verify that the decision knowledge from the deleted comment does
   *     not exist in the database
   *
   * Postcondition: decision knowledge from the deleted comment no longer exists
   *     in the database
   *
   */
  it('should delete all decision knowledge from the database that was in the body of a Jira issue comment when the comment is deleted (R4)', async () => {
    // Precondition: Jira issue exists with a comment containing decision knowledge
    const createdIssue = await createJiraIssue(
      'Task',
      'Plan the tasks from June until October'
    );
    const addedComment = await jira.addComment(
      createdIssue.key,
      '{issue}Which language should we use to define tasks?{issue}'
    );
    // Step 1: Delete the comment
    await axios.delete(
      `${JSONConfig.fullUrl}/rest/api/2/issue/${createdIssue.key}/comment/${addedComment.id}`,
      localCredentialsObject
    );

    // Step 2: Verify that the decision knowledge from the deleted comment does not exist in
    // the database
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.with.property(
        'summary',
        'Which language should we use to define tasks?'
      );
  });

  /**
   * TCS: Test delete knowledge element should delete a knowledge element from the database when it is removed from the description of a Jira issue (R5)
   *
   * Precondition: A Jira issue exists with decision knowledge in its description
   *
   * Step 1: Delete the decision knowledge element from the description of the Jira issue
   *
   * Step 2: Verify that the knowledge element no longer exists in the database
   *
   * Postcondition: The element is removed from the database
   */

  it('should delete a knowledge element from the database when it is removed from the description of a Jira issue (R5)', async () => {
    // Precondition: a Jira issue exists with decision knowledge in its
    // description or comment
    const issue = await createJiraIssue(
      'Task',
      'Buy mugs for serving coffee',
      '(!) How large to make the mugs?'
    );
    // Step 1: delete the decision knowledge element from the
    // description/comment of the Jira issue
    await jira.updateIssue(issue.id, {
      update: { description: [{ set: 'foo' }] },
    });
    // Step 2: verify that the knowledge element no longer exists in the database
    const knowledgeElements = await getKnowledgeElements();
    chai
      .expect(knowledgeElements)
      .to.not.contain.something.that.has.property(
        'description',
        'How large to make the mugs?'
      );
  });

  /**
   * TCS: Test delete knowledge element should delete a knowledge element from
   *    the database and knowledge graph when deletion is triggered in a view on
   *    the knowledge graph (R6)
   *
   * Precondition: A decision knowledge element exists
   *
   * Step 1: Delete decision knowledge element in a view on the knowledge graph (= call the deleteDecisionKnowledgeElement REST endpoint)
   *
   * Step 2: Verify that the element is no longer in the database
   *
   * Postcondition: The element is removed from the database
   */
  it('should delete a knowledge element from the database when deletion is triggered in a view on the knowledge graph (R6)', async () => {
    // Precondition: Decision knowledge element exists
    const jiraIssue = await createJiraIssue(
      'Task',
      'Order coffee from suppliers'
    );
    const knowledgeElement = await createDecisionKnowledgeElement(
      'Which suppliers should be contacted?',
      'Issue',
      's',
      jiraIssue.id,
      'i'
    );

    // Step 1: delete decision knowledge element in a view on the knowledge
    // graph (= call the deleteDecisionKnowledgeElement REST endpoint)
    await deleteDecisionKnowledgeElement(knowledgeElement.id, 's');

    // Step 2: verify the element is no longer in the database

    const knowledgeElementsInDatabase = await getKnowledgeElements();
    chai
      .expect(knowledgeElementsInDatabase)
      .to.not.contain.something.that.has.property('id', knowledgeElement.id);
  });

  /**
   * TCS: Test delete knowledge element should not remove knowledge element from comment when it is deleted via a view on the knowledge graph (R7)
   *
   * Precondition: Jira issue exists with decision knowledge in its comment
   *
   * Step 1: Delete the decision knowledge element via a view on the knowledge
   *    graph (= call the deleteDecisionKnowledgeElement REST endpoint)
   *
   * Step 2: Verify the element is not deleted from the issue comment
   *
   * Postcondition: Element is removed from knowledge graph and database.
   *    Element still exists in its original documentation location
   */
  it('should not remove knowledge element from comment when it is deleted via a view on the knowledge graph (R7)', async () => {
    // Precondition: Jira issue exists with decision knowledge in its description or comment
    const jiraIssue = await createJiraIssue(
      'Task',
      'Set up eBay storefront for the Moo company'
    );
    const knowledgeElement = await createDecisionKnowledgeElement(
      "Accept only currencies we don't have to pay fees for!",
      'Issue',
      's', // this issue will be created in a comment
      jiraIssue.id,
      'i'
    );
    // Step 1: Delete the decision knowledge element via a view on the
    // knowledge graph (= call the deleteDecisionKnowledgeElement REST
    // endpoint)
    await deleteDecisionKnowledgeElement(knowledgeElement.id, 's');

    // Step 2: Verify the element is not deleted from the issue comment
    const jiraIssueAfterKnowledgeDeletion = await jira.findIssue(jiraIssue.key);
    chai
      .expect(jiraIssueAfterKnowledgeDeletion.fields.comment.comments[0].body)
      .to.eql(
        "{issue}Accept only currencies we don't have to pay fees for!\n{issue}"
      );
  });

  /**
   * TCS: Test delete knowledge element should not allow a nonexistent element
   * to be deleted (E1)
   *
   * Precondition: none
   *
   * Step 1: Trigger deletion of element with id -1 (this id does not exist)
   *
   * Step 2: Verify that this results in a 500 error with the message that deletion failed
   *
   * Postcondition: Nothing changed
   */
  it('should not allow a nonexistent element to be deleted (E1)', async () => {
    // Step 1: trigger deletion of element with id -1 (this id does not exist)
    const result = await deleteDecisionKnowledgeElement(-1, 's');

    // Step 2: Verify that this results in a 500 error with the message that
    // deletion failed
    chai.expect(result.response.status).to.equal(500);
    chai
      .expect(result.response.data.error)
      .to.include('Deletion of decision knowledge element failed.');
  });
});
