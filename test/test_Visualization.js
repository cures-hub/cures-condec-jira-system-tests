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
      console.error(err);
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
      const visEdges = graph.data.edges.sort((a, b) => ((a.from > b.from) ? 1 : -1));
      const expectedNodes = {
        task: {
          expectedLabel: 'TASK\nDummy vis.js task',
          expectedGroup: 'task',
        },
        issue: {
          expectedLabel: 'ISSUE\nHow should we brew coffee?',
          expectedGroup: 'issue',
        },
        decision: {
          expectedLabel: 'DECISION\nUse a french press to brew coffee!',
          expectedGroup: 'decision',
        },
        alternative: {
          expectedLabel: 'ALTERNATIVE\nUse a filter coffee machine',
          expectedGroup: 'alternative',
        },
      };
      const expectedEdges = [
        {
          from: 'issue',
          to: 'task',
        },
        {
          from: 'alternative',
          to: 'issue',
        },
        {
          from: 'decision',
          to: 'issue',
        }];
      chai.expect(visNodes).to.have.length(4);
      chai.expect(visEdges).to.have.length(3);

      visNodes.forEach((node) => {
        chai.expect(node.label).to.eql(expectedNodes[node.group].expectedLabel);
        chai.expect(node.group).to.eql(expectedNodes[node.group].expectedGroup);

        // save the node ids so we can use them for the edge lookup
        expectedNodes[node.group].id = node.id;

        // replace the names in expected edges with the corresponding IDs
        // this is necessary because the IDs are dynamic so we can't hardcode them
        expectedEdges.forEach((connection) => {
          if (connection.from === node.group) {
            // eslint-disable-next-line no-param-reassign
            connection.from = node.id;
          }
          if (connection.to === node.group) {
            // eslint-disable-next-line no-param-reassign
            connection.to = node.id;
          }
        });
        expectedEdges.sort(((a, b) => ((a.from > b.from) ? 1 : -1)));
      });

      visEdges.forEach((edge, index) => {
        chai.expect(edge.from).to.eql(expectedEdges[index].from);
        chai.expect(edge.to).to.eql(expectedEdges[index].to);
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
});
