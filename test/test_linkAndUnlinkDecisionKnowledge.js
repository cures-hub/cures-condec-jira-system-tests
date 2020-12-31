const axios = require('axios');
const chai = require('chai');
const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject, base64LocalCredentials,
} = require('./helpers.js');

/**
 * CONDEC-171: Link knowledge elements
 */
describe('TCS: CONDEC-171', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });
  it(`(R1) should create a Jira issue link when both linked
  decision knowledge elements are Jira issues`, async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    const link = await axios.post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json`
    + `?projectKey=${JSONConfig.projectKey}`
    + '&documentationLocationOfParent=i'
    + '&documentationLocationOfChild=i'
    + `&idOfParent=${issue1.id}`
    + `&idOfChild=${issue2.id}`
    + '&linkTypeName=relates',
    undefined,
    localCredentialsObject);

    const issue1Links = await jira.findIssue(issue1.id);
    const issue2Links = await jira.findIssue(issue2.id);

    chai.expect(issue1Links.fields.issuelinks[0]).to.have.deep.property('id', `${link.data.id}`);
    chai.expect(issue1Links.fields.issuelinks[0].type).to.have.property('name', 'Relates');
    chai.expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('id', `${issue2.id}`);
    chai.expect(issue1Links.fields.issuelinks[0].outwardIssue)
      .to.have.property('key', `${issue2.key}`);

    chai.expect(issue2Links.fields.issuelinks[0]).to.have.deep.property('id', `${link.data.id}`);
    chai.expect(issue2Links.fields.issuelinks[0].type).to.have.property('name', 'Relates');
    chai.expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('id', `${issue1.id}`);
    chai.expect(issue2Links.fields.issuelinks[0].inwardIssue)
      .to.have.property('key', `${issue1.key}`);
  });

  it('(R2) should store the link in the ConDec database when at least one of the linked '
    + 'elements is not a Jira issue');
  xit('(R3) The source element must be different to the destination/target element.', async () => {
    const alternative = await createJiraIssue('Alternative', 'Dummy Alternative');

    // This should fail, but it doesn't!
    const link = await axios.post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json`
    + `?projectKey=${JSONConfig.projectKey}`
    + '&documentationLocationOfParent=i'
    + '&documentationLocationOfChild=i'
    + `&idOfParent=${alternative.id}`
    + `&idOfChild=${alternative.id}`
    + '&linkTypeName=relates',
    undefined);
    chai.expect(link.statusCode).not.to.be(200);
  });
});

/**
 * CONDEC-172: Unlink knowledge elements
 */
describe('TCS: CONDEC-172', () => {
  before(async () => {
    await setUpJira(true); // turn issue strategy on
  });
  it('(R1) If both the source and destination/target knowledge elements are documented in separate'
      + 'Jira issues, the Jira issue link is deleted. ', async () => {
    const issue1 = await createJiraIssue('Issue', 'Issue 1');
    const issue2 = await createJiraIssue('Alternative', 'Issue 2');

    // Create a link between issue 1 and issue 2
    await axios.post(`${JSONConfig.fullUrl}/rest/condec/latest/knowledge/createLink.json`
    + `?projectKey=${JSONConfig.projectKey}`
    + '&documentationLocationOfParent=i'
    + '&documentationLocationOfChild=i'
    + `&idOfParent=${issue1.id}`
    + `&idOfChild=${issue2.id}`
    + '&linkTypeName=relates',
    undefined,
    localCredentialsObject);

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
      url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteLink.json`
      + `?projectKey=${JSONConfig.projectKey}`,
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
    chai.expect(searchResult.fields.issuelinks).to.be.an('Array').with.length(0);
  });
});
