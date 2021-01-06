const axios = require('axios');
const chai = require('chai');
const JSONConfig = require('../config.json');
const {
  jira,
  setUpJira,
  createJiraIssue,
  localCredentialsObject,
  base64LocalCredentials,
} = require('./helpers.js');

/**
 * CONDEC-171: Link knowledge elements
 */
describe('TCS: CONDEC-171', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });
  it('(R1) If both the source and destination elements (=nodes) are Jira issues (documentation location is Jira issue), a Jira issue link is created.', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    const link = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
        `?projectKey=${JSONConfig.projectKey}` +
        '&documentationLocationOfParent=i' +
        '&documentationLocationOfChild=i' +
        `&idOfParent=${issue1.id}` +
        `&idOfChild=${issue2.id}` +
        '&linkTypeName=relates',
      undefined,
      localCredentialsObject
    );

    const issue1Links = await jira.findIssue(issue1.id);
    const issue2Links = await jira.findIssue(issue2.id);

    chai
      .expect(issue1Links.fields.issuelinks[0])
      .to.have.deep.property('id', `${link.data.id}`);
    chai
      .expect(issue1Links.fields.issuelinks[0].type)
      .to.have.property('name', 'Relates');
    chai
      .expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('id', `${issue2.id}`);
    chai
      .expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('key', `${issue2.key}`);

    chai
      .expect(issue2Links.fields.issuelinks[0])
      .to.have.deep.property('id', `${link.data.id}`);
    chai
      .expect(issue2Links.fields.issuelinks[0].type)
      .to.have.property('name', 'Relates');
    chai
      .expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('id', `${issue1.id}`);
    chai
      .expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('key', `${issue1.key}`);
  });

  it(
    '(R2) If at least one knowledge element has a different documentation location than a Jira issue, the link is stored in an internal database of the ConDec plugin and not as a Jira issue link.'
  );
  it('(R3) The source element must be different to the destination/target element.', async () => {
    const alternative = await createJiraIssue(
      'Alternative',
      'Dummy Alternative'
    );

    // This should fail, but it doesn't!
    const link = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
        `?projectKey=${JSONConfig.projectKey}` +
        '&documentationLocationOfParent=i' +
        '&documentationLocationOfChild=i' +
        `&idOfParent=${alternative.id}` +
        `&idOfChild=${alternative.id}` +
        '&linkTypeName=relates',
      undefined,
      localCredentialsObject
    );
    chai.expect(link.status).not.to.eql(200);
  });
  it(
    '(R4) If an issue (=decision problem) is linked to a decision in state "decided", the state of this issue is set to "resolved".'
  );
  xit(
    '(R5) A Jira issue link can only be created in a view on the knowledge graph if the user has the rights to link Jira issues (CONDEC-852, integrity).'
  );
  xit('(R6) If the webhook is activated, it will be fired (CONDEC-185).');
  it('(E1) Source and/or destination/target element with given id does not exist in database.')
  it('(E2) The user does not have the rights for linking.')
});

/**
 * CONDEC-172: Unlink knowledge elements
 */
describe('TCS: CONDEC-172', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });
  it(
    '(R1) If both the source and destination/target knowledge elements are documented in separate' +
      'Jira issues, the Jira issue link is deleted. ',
    async () => {
      const issue1 = await createJiraIssue('Issue', 'Issue 1');
      const issue2 = await createJiraIssue('Alternative', 'Issue 2');

      // Create a link between issue 1 and issue 2
      await axios.post(
        `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json` +
          `?projectKey=${JSONConfig.projectKey}` +
          '&documentationLocationOfParent=i' +
          '&documentationLocationOfChild=i' +
          `&idOfParent=${issue1.id}` +
          `&idOfChild=${issue2.id}` +
          '&linkTypeName=relates',
        undefined,
        localCredentialsObject
      );

      // Then delete the link
      const payload = {
        // THESE ELEMENTS MUST BE PASSED IN THIS ORDER!!
        idOfSourceElement: issue1.id,
        idOfDestinationElement: issue2.id,
        documentationLocationOfSourceElement: 'i',
        documentationLocationOfDestinationElement: 'i',
      };
      const deleteLinkRequest = {
        method: 'delete',
        url:
          `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink.json` +
          `?projectKey=${JSONConfig.projectKey}`,
        headers: {
          Authorization: `Basic ${base64LocalCredentials}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      try {
        // Due to some strangeness with axios, we have to construct the request as above before
        // sending it
        const deleted = await axios(deleteLinkRequest);
        chai.expect(deleted.status).to.eql(200);
      } catch (err) {
        console.error(err);
      }
      const searchResult = await jira.findIssue(issue1.key);
      // Make sure it's really gone
      chai
        .expect(searchResult.fields.issuelinks)
        .to.be.an('Array')
        .with.length(0);
    }
  );
  it(
    '(R2) If at least on knowledge element of the link (=edge) is not documented in a separate ' +
      'Jira issue, the link is deleted in a link database that comes with the ConDec plugin. '
  );
});
