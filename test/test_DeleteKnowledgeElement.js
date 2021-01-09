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
 * @decision Specify test cases for all rules and exceptions, including those
 * that will not be tested!
 * @pro Test cases can easily be implemented later
 * @con Test files grow in size, leading to poor readability
 *
 * @alternative Specify only test cases for rules and exceptions that will be
 * tested!
 * @pro Code is concise and easy to read
 * @con Not all rules/exceptions end up in the system test description. It can be hard to
 * find them later.
 *
 * @decision Disable test cases that will not be implemented using `xit`
 * @pro Test cases that are disabled don't show up in junit reports
 *
 * @issue Which naming convention should system test cases follow?
 * @decision Test cases should be named using the exact text of the
 * rule/exception they test!
 * @con If the text changes, it will be hard to find the test case again
 *
 * @alternative Describe blocks should be named TCS: <issue-key of SF to test>
 * @pro It is easy to find the requirement associated with a test in Jira
 * @con It is not obvious which system function is being tested, unless you know
 * the issue key
 * @decision  Describe blocks should be named TCS: <name of SF to test>
 * @pro It is obvious which functionality is tested
 */

describe('TCS: Delete knowledge element', () => {
  before(async () => {
    await setUpJira();
  });
  // This is tested in the tests for linking and unlinking
  xit(
    '(R1) All links (=edges) to and from the deleted knowledge element (=node) ' +
      'are deleted as well (CONDEC-172).'
  );
  it(
    '(R2) If a Jira issue is deleted, all decision knowledge elements in its description and ' +
      'comments are deleted in the database and knowledge graph.',
    async () => {
      // Step 1: Create an issue with decision knowledge in its description
      const issue = await createJiraIssue(
        'Task',
        'Develop strategy for maximizing joy',
        '{issue}Which method of transportation to use?{issue}\n{alternative}Use a bicycle!{alternative}'
      );
      // Step 2: add a comment containing decision knowledge
      await createDecisionKnowledgeElement(
        'Use a tricycle!',
        'Decision',
        's',
        issue.id,
        'i'
      );

      // Step 3: delete the decision knowledge element
      await jira.deleteIssue(issue.id);

      // Step 4: Check knowledge elements are not in the database
      // (if they are not in the database, they also can't be in the knowledge graph)
      const knowledgeElements = await getKnowledgeElements();
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'summary',
          'Use a bicycle!'
        );
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'summary',
          'Which method of transportation to use?'
        );

      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'summary',
          'Use a tricycle!'
        );
    }
  );
  it(
    '(R3) If a Jira issue is deleted, the knowledge element (=node) that represents this Jira' +
      ' issue is deleted in the knowledge graph.',
    async () => {
      // Precondition: Jira issue exists
      const issue = await createJiraIssue(
        'Task',
        'Develop strategy for fast and cost-effective pizza delivery'
      );
      // Step 1: delete the Jira issue
      await jira.deleteIssue(issue.id);

      const knowledgeElements = await getKnowledgeElements();
      // Step 2: Verify that the issue is no longer in the database
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'summary',
          'Develop strategy for fast and cost-effective pizza delivery'
        );
    }
  );
  it(
    '(R4) If a Jira issue comment is deleted, all decision knowledge ' +
      'elements in its body are deleted in the database and knowledge graph. ',
    async () => {
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

      // Step 2: Verify that the deleted decision knowledge from the comment does not appear in the graphs
      const searchPayload = {
        searchTerm: '',
        selectedElement: createdIssue.key,
        projectKey: JSONConfig.projectKey,
      };
      const treantGraph = await axios.post(
        `${JSONConfig.fullUrl}/rest/condec/latest/view/getTreant.json`,
        searchPayload,
        localCredentialsObject
      );

      const visGraph = await axios.post(
        `${JSONConfig.fullUrl}/rest/condec/latest/view/getVis.json`,
        searchPayload,
        localCredentialsObject
      );
      chai.expect(visGraph.data.nodes).to.have.lengthOf(1); // Graph should just contain the root
      // eslint-disable-next-line no-unused-expressions
      chai.expect(visGraph.data.edges).to.be.empty;
      // eslint-disable-next-line no-unused-expressions
      chai.expect(treantGraph.data.nodeStructure.children).to.be.empty;

      // Step 3: Verify that the deleted decision knowledge does not exist in
      // the database
      const knowledgeElements = await getKnowledgeElements();
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.with.property(
          'summary',
          'Which language should we use to define tasks?'
        );
    }
  );

  it(
    '(R5) If a decision knowledge element is deleted in the description or ' +
      'a comment of a Jira issue (through deleting in the body/text),' +
      ' it is deleted in the database and knowledge graph.',
    async () => {
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
      // Step 2: verify that the knowledge element no longer exists
      const knowledgeElements = await getKnowledgeElements();
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'description',
          'How large to make the mugs?'
        );
    }
  );

  it(
    '(R6) If a decision knowledge element is deleted in a view on the knowledge graph, it is ' +
      'deleted in the database and in the knowledge graph (i.e. datastructure).',
    async () => {
      // Precondition: decision knowledge elements exist
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

      // Step 2: verify the element is no longer in the database (and therefore
      // also no longer in the knowledge graph)

      const knowledgeElementsInDatabase = await getKnowledgeElements();
      chai
        .expect(knowledgeElementsInDatabase)
        .to.not.contain.something.that.has.property('id', knowledgeElement.id);
    }
  );
  it(
    '(R7) If a decision knowledge element documented in the description or a comment of a Jira' +
      'issue is deleted in a view on the knowledge graph, it is not removed from the description' +
      ' or comment (i.e. the body/text of the description/comment is not changed).',
    async () => {
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
      // Step 1: delete the decision knowledge element via a view on the
      // knowledge graph (= call the deleteDecisionKnowledgeElement REST
      // endpoint)
      await deleteDecisionKnowledgeElement(knowledgeElement.id, 's');

      // Step 2: verify the element is not deleted from the issue comment
      const jiraIssueAfterKnowledgeDeletion = await jira.findIssue(
        jiraIssue.key
      );
      chai
        .expect(jiraIssueAfterKnowledgeDeletion.fields.comment.comments[0].body)
        .to.eql(
          "{issue}Accept only currencies we don't have to pay fees for!\n{issue}"
        );
    }
  );
  xit(
    '(R8) Decision knowledge elements documented in code comments cannot be deleted in Jira' +
      ' (only directly in the code).'
  );
  xit(
    // Since this would require meta-testing, we omit it here.
    '(R9) When the Jira project is deleted, all knowledge elements are deleted in the database' +
      ' and the knowledge graph.'
  );
  xit(
    '(R10) A Jira issue can only be deleted in a view on the knowledge graph if the user has ' +
      'the rights to delete Jira issues (CONDEC-852, integrity).'
  );
  xit(
    '(R11) A decision knowledge element documented within the description or a comment of a ' +
      'Jira issue can also be deleted in a view on the knowledge graph even if the user does ' +
      'not have the right to change the text of the description/comment, because during' +
      ' deletion in a view the body/text of the description/comment is not updated (see R7).'
  );
  xit('(R12) If the webhook is activated, it will be fired (CONDEC-185).');
  it(
    '(E1) Knowledge element with given id and documentation location ' +
      'does not exist in database.',
    async () => {
      // Step 1: try to delete the element with id -1 (this id does not exist)
      const result = await deleteDecisionKnowledgeElement(-1, 's');

      // Step 2: Verify that this results in a 500 error with the message that
      // deletion failed
      chai.expect(result.response.status).to.equal(500);
      chai
        .expect(result.response.data.error)
        .to.include('Deletion of decision knowledge element failed.');
    }
  );
  xit('(E2) The user does not have the rights for deletion.');
});
