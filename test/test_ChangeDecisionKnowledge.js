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
  getSpecificKnowledgeElement,
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

  it(
    '(R2) If the user tries to change a decision to an alternative, ' +
      'the knowledge type cannot be changed (i.e. it stays a decision), ' +
      'but the status of the decision is changed to "rejected". ',
    async () => {
      const issue = await createDecisionKnowledgeElement(
        'Only users with admin rights should be able to set the toggle!',
        'Decision',
        'i'
      );
      const updatePayload = Object.assign(issue, { type: 'Alternative' });

      await updateDecisionKnowledgeElement(0, null, updatePayload);
      const updatedIssue = await getSpecificKnowledgeElement(issue.id, 'i');
      chai.expect(updatedIssue).to.be.like({
        id: issue.id,
        type: 'Decision',
        status: 'rejected',
      });
    }
  );
  it(
    '(R3) If the status of a decision is set to "challenged" or "rejected", the status ' +
      'of the linked issue (=decision problem) is set to "unresolved" (if the issue does ' +
      'not have any other decisions in status "decided" linked).',
    async () => {
      // First part: check for status 'challenged'
      const issue1 = await createDecisionKnowledgeElement(
        'Which font should be used in the user interface?',
        'Issue',
        'i'
      );
      const decision1 = await createDecisionKnowledgeElement(
        'Use Wingdings for the user interface font!',
        'Decision',
        'i',
        issue1.id,
        'i'
      );
      const update1Payload = Object.assign(decision1, { status: 'challenged' });
      await updateDecisionKnowledgeElement(0, null, update1Payload);

      const issue1AfterUpdate = await getSpecificKnowledgeElement(
        issue1.id,
        'i'
      );
      chai
        .expect(issue1AfterUpdate)
        .to.be.like({ id: issue1.id, status: 'unresolved' });

      // Second part: check for status 'rejected'
      const issue2 = await createDecisionKnowledgeElement(
        'Which color scheme should be used for the website?',
        'Issue',
        'i'
      );
      const decision2 = await createDecisionKnowledgeElement(
        'Use a dark color scheme for the website!',
        'Decision',
        'i',
        issue2.id,
        'i'
      );
      const update2Payload = Object.assign(decision2, { status: 'rejected' });
      await updateDecisionKnowledgeElement(0, null, update2Payload);

      const issue2AfterUpdate = await getSpecificKnowledgeElement(
        issue2.id,
        'i'
      );
      chai
        .expect(issue2AfterUpdate)
        .to.be.like({ id: issue2.id, status: 'unresolved' });
    }
  );
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
