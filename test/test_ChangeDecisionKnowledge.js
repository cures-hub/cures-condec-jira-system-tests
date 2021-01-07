const axios = require('axios');
const chai = require('chai');

const JSONConfig = require('../config.json');
const {
  jira,
  setUpJira,
  createJiraIssue,
  localCredentialsObject,
  createDecisionKnowledgeElement,
  getKnowledgeElements,
  updateDecisionKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe('TCS: CONDEC-169', () => {
  before(async () => {
    await setUpJira(true); // These tests need the Jira issue strategy, so we explicitly set it here
  });
  it('(R1) If an alternative is changed to a decision, its status is changed to "decided".', async () => {
    // Create a Jira issue and a comment containing decision knowledge
    const jiraTask = await createJiraIssue(
      'Task',
      'Enable persistence of user data'
    );

    const issue = await createDecisionKnowledgeElement(
      'Which database should be used to store user data?',
      'Issue',
      's',
      jiraTask.id,
      'i'
    );
    const alternative = await createDecisionKnowledgeElement(
      'Use Postgres to store user data!',
      'Alternative',
      's',
      jiraTask.id,
      'i'
    );
    const updatedAlternative = Object.assign(alternative, { type: 'Decision' });
    await updateDecisionKnowledgeElement(issue.id, 'i', updatedAlternative);
    const decisionKnowledgeAfterChange = await getKnowledgeElements();
    chai
      .expect(decisionKnowledgeAfterChange)
      .to.be.an('Array')
      .that.contains.something.like({
        id: alternative.id,
        type: 'Decision',
        status: 'decided',
      });
  });

  // This test currently fails, since the system sets the knowledge type
  // to "Other" and not "Alternative"
  xit('(R2) should change the knowledge type when the status is changed', async () => {
    const createdIssue = await createJiraIssue(
      'Task',
      'Add a toggle for enabling data persistence'
    );
    await jira.addComment(
      createdIssue.id,
      `{issue}Who should be allowed to use the toggle?{issue}
      {decision}Everyone should be allowed to set the toggle!{decision}
      {alternative}Only users with admin rights should be allowed to set the toggle!{alternative}`
    );

    // get the id of the decision element so we can change its status to rejected
    const decisionElement = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      { projectKey: JSONConfig.projectKey, searchTerm: 'Everyone' },
      localCredentialsObject
    );
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
      localCredentialsObject
    );

    // Check that the knowledge type also changed
    const formerDecisionElement = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      { projectKey: JSONConfig.projectKey, searchTerm: 'Everyone' },
      localCredentialsObject
    );
    chai.expect(formerDecisionElement.data[0].status).to.eql('rejected'); // sanity check
    chai.expect(formerDecisionElement.data[0].type).to.eql('Alternative');
  });

  // seems like the system doesn't allow changing the location...
  xit(`(R4) should delete comment and create Jira issue instead when an element's location is
  changed from comment to Jira issue`, async () => {
    const createdIssue = await createJiraIssue(
      'Task',
      'Add color-coding to persistence strategy page'
    );
    await jira.addComment(
      createdIssue.id,
      `{issue}Which color should represent that data is stored locally?{issue}
      {decision}Green should be used to represent locally stored data!{decision}`
    );

    // get the id of the decision element so we can change its status to rejected
    const decisionElement = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      {
        projectKey: JSONConfig.projectKey,
        searchTerm: 'Which color',
      },
      localCredentialsObject
    );
    const idOfDecision = decisionElement.data[0].id;
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/updateDecisionKnowledgeElement.json`,
      {
        id: idOfDecision,
        projectKey: JSONConfig.projectKey,
        documentationLocation: 'i', // change to issue here
      },
      localCredentialsObject
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
  it(
    '(R5) should update the comment containing an element that is changed via the changeElement interface'
  );
  it(
    '(E) should throw an error when the element with given id and documentation location does not exist in database'
  );
});
