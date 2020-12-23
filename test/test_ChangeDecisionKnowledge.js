const axios = require('axios');
const chai = require('chai');

const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject,
} = require('./helpers.js');

describe('TCS: CONDEC-169', () => {
  before(async () => {
    await setUpJira(true);
  });
  it('(R1) should change the status when the knowledge type is changed', async () => {
    // Create a Jira issue and a comment containing decision knowledge
    const createdIssue = await createJiraIssue('Task', 'Enable persistence of user data');
    await jira.addComment(
      createdIssue.id,
      `{issue}Which database should be used to store user data?{issue}
      {alternative}Use Postgres to store user data!{alternative}
      {alternative}Use SQLite to store user data!{alternative}`,
    );

    // get the id of the sqlite element so we can change its type from alternative to decision
    const sqliteAlternativeElement = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
        { projectKey: JSONConfig.projectKey, searchTerm: 'SQLite' },
        localCredentialsObject);
    const idOfSqliteElement = sqliteAlternativeElement.data[0].id;
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/updateDecisionKnowledgeElement.json`,
      {
        id: idOfSqliteElement,
        summary: null,
        type: 'Decision', // here we change from "Alternative" to "Decision"
        projectKey: JSONConfig.projectKey,
        description: null,
        documentationLocation: 's',
        status: null,
      },
      localCredentialsObject,
    );

    // Check that the status changed
    const sqliteDecisionElement = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
        { projectKey: JSONConfig.projectKey, searchTerm: 'SQLite' },
        localCredentialsObject);
    chai.expect(sqliteDecisionElement.data[0].status).to.eql('decided');
    chai.expect(sqliteDecisionElement.data[0].type).to.eql('Decision');
  });
  it('(R2) should change the knowledge type when the status is changed');
  it('(R3) Alternatives that will never be picked should get the status discarded'); // is this something we can test? or rather a user issue
  it('(R4) should delete comment and create Jira issue instead when an element\'s location is changed from comment to Jira issue');
  it('(R5) should update the comment containing an element that is changed via the changeElement interface');
  it('(R6) should fire the webhook if it is activated'); // not sure what this means
  it('(E) should throw an error when the element with given id and documentation location does not exist in database');
});
