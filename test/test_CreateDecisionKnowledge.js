/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const chai = require('chai');
const { By, Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const { jira, setUpJira } = require('./helpers.js');

describe('TCS: CONDEC-168', () => {
  before((done) => {
    setUpJira();
    done();
  });
  it('should create a decision knowledge issue via the create issue interface', async () => {
    const options = new firefox.Options();
    options.setProfile(JSONConfig.firefoxProfilePath);
    const driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();
    // always wait for up to 10 seconds
    await driver.manage().setTimeouts({ implicit: 10000 });
    try {
      // TODO: maybe make a helper function that calls this
      const issue = await jira.addNewIssue({
        fields: {
          project: {
            key: JSONConfig.projectKey,
          },
          summary: 'What to do with decision knowledge?',
          issuetype: {
            name: 'Issue',
          },
          reporter: {
            name: 'admin',
          },
        },
      });
      console.log(`Created issue: ${issue.key}`);
      // make sure the created issue has the correct type in the GUI
      await driver.get(`${JSONConfig.fullUrl}/browse/${issue.key}`);
      chai.assert.equal(await driver.findElement(By.id('type-val')).getText(), 'Issue');
    } catch (err) {
      console.log(err);
    } finally {
      driver.quit();
    }
  });
});
