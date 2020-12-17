const axios = require('axios');
const chai = require('chai');

const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject, base64LocalCredentials
} = require('./helpers.js');

describe('TCS: CONDEC-170', () => {
  before(async () => {
    await setUpJira();
  });
  it('should delete a decision knowledge comment', async () => {
    // Create a task in Jira with a decision knowledge comment
    const createdIssue = await createJiraIssue('Task', 'The easiest task in the world');
    const commentString = '{issue}Which language should we use to define tasks?{issue}';
    const addedComment = await jira.addComment(createdIssue.key, commentString);

    // Delete the comment
    await axios.delete(
      `${JSONConfig.fullUrl}/rest/api/2/issue/${createdIssue.key}/comment/${addedComment.id}`,
      localCredentialsObject,
    );

    // Check that the comment does not appear in the treant or vis graphs
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

    chai.expect(visGraph.data.nodes).to.have.lengthOf(1); // This graph should just contain the root
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

    const deleteDecisionKnowledgeRequest = {
      method: 'delete',
      url: 'http://localhost:2990/jira/rest/condec/latest/knowledge/deleteDecisionKnowledgeElement.json',
      headers: {
        Authorization: `Basic ${base64LocalCredentials}`,
        'Content-Type': 'application/json',
        Cookie: 'JSESSIONID=53911A156DD2C7A5F22654F8F488D38F; atlassian.xsrf.token=BWP3-NZB2-6EDY-6C7K_3320a31c2a596ece222918dd26804ac2bd190306_lin',
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

    // eslint-disable-next-line no-unused-expressions
    chai.expect(treantGraphAfterDeletion.data.nodeStructure.children).to.be.empty;
  });
});
