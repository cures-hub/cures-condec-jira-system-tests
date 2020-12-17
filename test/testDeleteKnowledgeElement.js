const axios = require('axios');
const chai = require('chai');

const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject,
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

  it('should throw an exception when deleting a nonexistent element');
});
