/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const chai = require('chai');
const { By, Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const { jira, setUpJira } = require('./helpers.js');

describe('TCS: CONDEC-123', () => {
  before((done) => {
    setUpJira();
    done();
  });
  it('should show decision knowledge comments with the correct icons', async () => {
    const options = new firefox.Options();
    options.setProfile(JSONConfig.firefoxProfilePath);
    const driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();
    // always wait for up to 10 seconds
    await driver.manage().setTimeouts({ implicit: 10000 });
    try {
      const issue = await jira.addNewIssue({
        fields: {
          project: {
            key: JSONConfig.projectKey,
          },
          summary: 'Dummy task',
          issuetype: {
            name: 'Task',
          },
          reporter: {
            name: 'admin',
          },
        },
      });
      console.log(`Created issue: ${issue.key}`);
      const commentString = `{issue}How should we brew coffee?{issue}
      {alternative}Use a french press{alternative}
      {pro}French press coffee tastes very good{pro}
      {con}French press coffee takes a lot of cleanup{con}
      {alternative}Use a filter coffee machine{alternative}
      {con}Filter coffee doesn't taste very good{con}
      {pro}Filter coffee does not require much cleanup{pro}
      {decision}Use a french press to brew coffee!{decision}`;
      const decisionKnowledgeTypeList = [
        'issue',
        'alternative',
        'argument_pro',
        'argument_con',
        'alternative',
        'argument_con',
        'argument_pro',
        'decision',
      ];
      const commentObject = await jira.addComment(issue.key, commentString);

      await driver.get(`${JSONConfig.fullUrl}/browse/${issue.key}?focusedCommentId=${commentObject.id}`);

      // the html code is generated dynamically via the comment's id, so we need to use the id from
      // above to find the right element
      const decisionKnowledgeElements = await driver.findElements(By.xpath(`//*[@id='comment-${commentObject.id}']//div/p/img`));

      // check that the icons are correct
      for (let i = 0; i < decisionKnowledgeElements.length; i++) {
        const src = await decisionKnowledgeElements[i].getAttribute('src');
        chai.expect(src).to.contain(`${decisionKnowledgeTypeList[i]}.png`);
      }
    } catch (err) {
      console.log(err);
    } finally {
      driver.quit();
    }
  });
});
