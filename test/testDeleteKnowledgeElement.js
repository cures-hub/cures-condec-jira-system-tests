const axios = require('axios');
const chai = require('chai');
const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject, base64LocalCredentials,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe('TCS: CONDEC-170', () => {
  before(async () => {
    await setUpJira();
  });
  it('should not show rationale elements in the graph after comment containing them is deleted',
    async () => {
    // Create a task in Jira with a decision knowledge comment
      const createdIssue = await createJiraIssue('Task', 'The easiest task in the world');
      const commentString = '{issue}Which language should we use to define tasks?{issue}';
      const addedComment = await jira.addComment(createdIssue.key, commentString);

      // Delete the comment
      await axios.delete(
        `${JSONConfig.fullUrl}/rest/api/2/issue/${createdIssue.key}/comment/${addedComment.id}`,
        localCredentialsObject,
      );

      // Check that the documented decision knowledge from the comment does not appear in the graphs
      const searchPayload = {
        searchTerm: '',
        selectedElement: createdIssue.key,
        projectKey: JSONConfig.projectKey,
      };
      const treantGraph = await axios
        .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getTreant.json`,
          searchPayload,
          localCredentialsObject);

      const visGraph = await axios
        .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getVis.json`,
          searchPayload,
          localCredentialsObject);
      chai.expect(visGraph.data.nodes).to.have.lengthOf(1); // Graph should just contain the root
      // eslint-disable-next-line no-unused-expressions
      chai.expect(visGraph.data.edges).to.be.empty;
      // eslint-disable-next-line no-unused-expressions
      chai.expect(treantGraph.data.nodeStructure.children).to.be.empty;
    });

  it('should delete child elements of a decision knowledge issue that is deleted', async () => {
    const createdIssue = await createJiraIssue('Task', 'Write a definition of ready for tasks');
    const commentString = `{issue}Which language should we use to define tasks?{issue}
        {decision}Use English to define tasks!{decision}
        {alternative}Use German to define tasks!{alternative}`;
    await jira.addComment(createdIssue.key, commentString);
    const searchPayload = {
      searchTerm: '',
      selectedElement: createdIssue.key,
      projectKey: JSONConfig.projectKey,
    };

    // We get the graph here in order to access the decision elements ID, so we know what to delete
    const treantGraph = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getTreant.json`,
        searchPayload,
        localCredentialsObject);

    // Then save the issue, decision, and alternative ids for later
    const issue = treantGraph.data.nodeStructure.children[0];
    const decisionID = issue.children[0].HTMLid;
    const alternativeID = issue.children[1].HTMLid;

    const deleteDecisionKnowledgeRequest = {
      method: 'delete',
      url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteDecisionKnowledgeElement.json`,
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
      },
      data: {
        id: treantGraph.data.nodeStructure.children[0].HTMLid, // Child of the root element
        projectKey: JSONConfig.projectKey,
        documentationLocation: treantGraph.data.nodeStructure.children[0]
          .text.documentationLocation,
      },
    };

    await axios.request(deleteDecisionKnowledgeRequest);

    const treantGraphAfterDeletion = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getTreant.json`,
        searchPayload,
        localCredentialsObject);

    // The graph for this element should not contain the child elements anymore
    // eslint-disable-next-line no-unused-expressions
    chai.expect(treantGraphAfterDeletion.data.nodeStructure.children).to.be.empty;

    // The child elements should still exist in the database after their parent was deleted
    const allKnowledgeElementsAfterDeletion = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
        { projectKey: JSONConfig.projectKey, searchTerm: '' },
        localCredentialsObject);

    chai.expect(allKnowledgeElementsAfterDeletion.data).to.be.an('array').that.contains.something.like(
      { id: decisionID, type: 'Decision', summary: 'Use English to define tasks!' },
    );
    chai.expect(allKnowledgeElementsAfterDeletion.data).to.be.an('array').that.contains.something.like(
      { id: alternativeID, type: 'Alternative', summary: 'Use German to define tasks!' },
    );
  });
  it('should throw an error when the element to delete does not exist in the database', async () => {
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
      chai.expect(err.response.data.error).to.include('Deletion of decision knowledge element failed.');
    }
  });
});
