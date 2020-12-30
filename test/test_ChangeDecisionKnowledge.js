const axios = require('axios');
const chai = require('chai');

const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject,
} = require('./helpers.js');

describe('TCS: CONDEC-169', () => {
  before(async () => {
    await setUpJira(true); // These tests need the Jira issue strategy, so we explicitly set it here
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

  // This test currently fails, since the system sets the knowledge type
  // to "Other" and not "Alternative"
  xit('(R2) should change the knowledge type when the status is changed', async () => {
    const createdIssue = await createJiraIssue('Task', 'Add a toggle for enabling data persistence');
    await jira.addComment(
      createdIssue.id,
      `{issue}Who should be allowed to use the toggle?{issue}
      {decision}Everyone should be allowed to set the toggle!{decision}
      {alternative}Only users with admin rights should be allowed to set the toggle!{alternative}`,
    );

    // get the id of the decision element so we can change its status to rejected
    const decisionElement = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
        { projectKey: JSONConfig.projectKey, searchTerm: 'Everyone' },
        localCredentialsObject);
    const idOfDecision = decisionElement.data[0].id;
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/updateDecisionKnowledgeElement.json`,
      {
        id: idOfDecision,
        summary: null,
        projectKey: JSONConfig.projectKey,
        description: null,
        documentationLocation: 's',
        status: 'rejected',
      },
      localCredentialsObject,
    );

    // Check that the knowledge type also changed
    const formerDecisionElement = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
        { projectKey: JSONConfig.projectKey, searchTerm: 'Everyone' },
        localCredentialsObject);
    chai.expect(formerDecisionElement.data[0].status).to.eql('rejected'); // sanity check
    chai.expect(formerDecisionElement.data[0].type).to.eql('Alternative');
  });

  // seems like the system doesn't allow changing the location...
  xit(`(R4) should delete comment and create Jira issue instead when an element's location is
  changed from comment to Jira issue`, async () => {
    const createdIssue = await createJiraIssue('Task', 'Add color-coding to persistence strategy page');
    await jira.addComment(
      createdIssue.id,
      `{issue}Which color should represent that data is stored locally?{issue}
      {decision}Green should be used to represent locally stored data!{decision}`,
    );

    // get the id of the decision element so we can change its status to rejected
    const decisionElement = await axios
      .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`, {
        projectKey: JSONConfig.projectKey,
        searchTerm: 'Which color',
      },
      localCredentialsObject);
    const idOfDecision = decisionElement.data[0].id;
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/updateDecisionKnowledgeElement.json`, {
        id: idOfDecision,
        projectKey: JSONConfig.projectKey,
        documentationLocation: 'i', // change to issue here
      },
      localCredentialsObject,
    );

    // Check that the knowledge type also changed
    // const formerDecisionElement = await axios
    //   .post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`, {
    //     projectKey: JSONConfig.projectKey,
    //     searchTerm: 'Everyone',
    //   },
    //   localCredentialsObject);
    // chai.expect(formerDecisionElement.data[0].status).to.eql('rejected'); // sanity check
    // chai.expect(formerDecisionElement.data[0].type).to.eql('Alternative');
  });
  it('(R5) should update the comment containing an element that is changed via the changeElement interface');
  it('(E) should throw an error when the element with given id and documentation location does not exist in database');
});
