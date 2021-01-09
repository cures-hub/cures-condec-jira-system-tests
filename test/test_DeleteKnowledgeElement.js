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
} = require('./helpers.js');

chai.use(require('chai-like'));
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
      const issue = await createJiraIssue(
        'Task',
        'Develop strategy for maximizing joy',
        '{issue}Which method of transportation to use?{issue}\n{alternative}Use a bicycle!{alternative}'
      );
      await jira.deleteIssue(issue.id);

      // Check knowledge elements are not in the database
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
    }
  );
  it(
    '(R3) If a Jira issue is deleted, the knowledge element (=node) that represents this Jira' +
      ' issue is deleted in the knowledge graph.',
    async () => {
      const issue = await createJiraIssue(
        'Task',
        'Develop strategy for fast and cost-effective pizza delivery',
        '{issue}Which method of transportation to use?{issue}\n{decision}Use a moped!{decision}'
      );
      await jira.deleteIssue(issue.id);
      // Check knowledge elements are not in the database
      const knowledgeElements = await getKnowledgeElements();

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
      // Create a task in Jira with a decision knowledge comment
      const createdIssue = await createJiraIssue(
        'Task',
        'Plan the tasks from June until October'
      );
      const commentString =
        '{issue}Which language should we use to define tasks?{issue}';
      const addedComment = await jira.addComment(
        createdIssue.key,
        commentString
      );

      // Delete the comment
      await axios.delete(
        `${JSONConfig.fullUrl}/rest/api/2/issue/${createdIssue.key}/comment/${addedComment.id}`,
        localCredentialsObject
      );

      // Check that the documented decision knowledge from the comment does not appear in the graphs
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
    }
  );

  it(
    '(R5) If a decision knowledge element is deleted in the description or ' +
      'a comment of a Jira issue (through deleting in the body/text),' +
      ' it is deleted in the database and knowledge graph.',
    async () => {
      const issue = await createJiraIssue(
        'Task',
        'Buy mugs for serving coffee',
        '(!) How large to make the mugs?'
      );
      await jira.updateIssue(issue.id, {
        update: { description: [{ set: 'foo' }] },
      });
      const knowledgeElements = await getKnowledgeElements();
      chai
        .expect(knowledgeElements)
        .to.not.contain.something.that.has.property(
          'description',
          'How large to make the mugs?'
        );
      chai.expect(knowledgeElements).to.contain.something.like({
        summary: 'Buy mugs for serving coffee',
        description: 'foo',
      });
    }
  );
  xit(
    '(R6) If a decision knowledge element is deleted in a view on the knowledge graph, it is ' +
      'deleted in the database and in the knowledge graph (i.e. datastructure).'
  );
  xit(
    '(R7) If a decision knowledge element documented in the description or a comment of a Jira' +
      'issue is deleted in a view on the knowledge graph, it is not removed from the description' +
      ' or comment (i.e. the body/text of the description/comment is not changed).'
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
      const deleteDecisionKnowledgeRequest = {
        method: 'delete',
        url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteDecisionKnowledgeElement.json`,
        headers: {
          Authorization: `Basic ${base64LocalCredentials}`,
          'Content-Type': 'application/json',
        },
        data: {
          id: -1, // this ID won't exist as ConDec only gives positive ids
          projectKey: JSONConfig.projectKey,
          documentationLocation: 's',
        },
      };
      try {
        await axios.request(deleteDecisionKnowledgeRequest);
      } catch (err) {
        chai.expect(err.response.status).to.equal(500);
        chai
          .expect(err.response.data.error)
          .to.include('Deletion of decision knowledge element failed.');
      }
    }
  );
  xit('(E2) The user does not have the rights for deletion.');
});
