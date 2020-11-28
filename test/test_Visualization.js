const axios = require('axios');
const chai = require('chai');
// const { By, Builder } = require('selenium-webdriver');
// const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const {
  jira, setUpJira, createJiraIssue, localCredentialsObject,
} = require('./helpers.js');

describe('TCS: CONDEC-177', () => {
  before(async () => {
    await setUpJira();
  });
  it('should generate the correct treant vis graph', async () => {
    try {
      const createdIssue = await createJiraIssue('Task', 'Dummy treant vis graph task');

      const commentString = `{issue}How should we brew coffee?{issue}
      {decision}Use a french press to brew coffee!{decision}
      {alternative}Use a filter coffee machine{alternative}`;

      await jira.addComment(createdIssue.key, commentString);
      const searchPayload = {
        searchTerm: '',
        selectedElement: createdIssue.key,
        projectKey: JSONConfig.projectKey,
      };
      const graph = await axios
        .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getTreant.json`,
          searchPayload,
          localCredentialsObject);
      // check that the tree has contains the correct data by traversing the graph

      const rootLevel = graph.data.nodeStructure.children;

      chai.expect(rootLevel.length).to.eql(1); // there should only be one root element
      chai.expect(rootLevel[0].link.title).to.eql('How should we brew coffee?');
      chai.expect(rootLevel[0].text.title).to.eql('How should we brew coffee?');
      chai.expect(rootLevel[0].image).to.contain('issue.png');

      const secondLevel = rootLevel[0].children;
      chai.expect(secondLevel.length).to.eql(2); // the root has two children - the two alternatives

      chai.expect(secondLevel[0].link.title).to.eql('Use a french press to brew coffee!');
      chai.expect(secondLevel[0].text.title).to.eql('Use a french press to brew coffee!');
      chai.expect(secondLevel[0].image).to.contain('decision.png');

      chai.expect(secondLevel[1].link.title).to.eql('Use a filter coffee machine');
      chai.expect(secondLevel[1].text.title).to.eql('Use a filter coffee machine');
      chai.expect(secondLevel[1].image).to.contain('alternative.png');

      chai.expect(secondLevel[0].children.length).to.eql(0);
      chai.expect(secondLevel[1].children.length).to.eql(0);
    } catch (err) {
      console.log(err);
    }
  });
});

describe('TCS: CONDEC-492', () => {
  before(async () => {
    await setUpJira();
  });
  it('should generate the correct vis.js graph', async () => {
    try {
      const createdIssue = await createJiraIssue('Task', 'Dummy vis.js task');

      const commentString = `{issue}How should we brew coffee?{issue}
      {decision}Use a french press to brew coffee!{decision}
      {alternative}Use a filter coffee machine{alternative}`;

      await jira.addComment(createdIssue.key, commentString);
      const searchPayload = {
        searchTerm: '',
        selectedElement: createdIssue.key,
        projectKey: JSONConfig.projectKey,
      };
      const graph = await axios
        .post(`${JSONConfig.fullUrl}/rest/condec/latest/view/getVis.json`,
          searchPayload,
          localCredentialsObject);

      // sort here so we can guarantee the order for later comparisons
      const visNodes = graph.data.nodes.sort((a, b) => ((a.id > b.id) ? 1 : -1));
      const visEdges = graph.data.edges;

      const expectedLabels = [
        'TASK\nDummy task',
        'ISSUE\nHow should we brew coffee?',
        'DECISION\nUse a french press to brew coffee!',
        'ALTERNATIVE\nUse a filter coffee machine',
      ];
      const expectedGroups = ['task', 'issue', 'decision', 'alternative'];

      chai.expect(visNodes).to.have.length(4);
      chai.expect(visEdges).to.have.length(3);

      // TODO test more things about the edges than the length
      visNodes.forEach((node, index) => {
        chai.expect(node.label).to.eql(expectedLabels[index]);
        chai.expect(node.group).to.eql(expectedGroups[index]);
      });
    } catch (err) {
      console.log(err);
    }
  });
});
