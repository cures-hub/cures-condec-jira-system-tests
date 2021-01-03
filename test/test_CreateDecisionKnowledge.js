const chai = require('chai');
const { By, Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const { setUpJira, createJiraIssue } = require('./helpers.js');

describe('TCS: CONDEC-168', () => {
  before((done) => {
    // explicitly use issue persistence strategy here
    setUpJira(true);
    done();
  });
  it('should create a decision knowledge issue via the create issue interface', async () => {
    const options = new firefox.Options();
    options.setProfile(JSONConfig.firefoxProfilePath);
    const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();

    // always wait for up to 10 seconds
    await driver.manage().setTimeouts({ implicit: 10000 });
    try {
      const issue = await createJiraIssue('Issue', 'What to do with decision knowledge?');

      // make sure the created issue has the correct type in the GUI
      await driver.get(`${JSONConfig.fullUrl}/browse/${issue.key}`);
      chai.assert.equal(await driver.findElement(By.id('type-val')).getText(), 'Issue');
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      driver.quit();
    }
  });
});
