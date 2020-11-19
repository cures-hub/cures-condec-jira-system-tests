const chai = require('chai');
const { Builder, By } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const JSONConfig = require('../config.json');

require('geckodriver');

describe('Test SF: create decision knowledge element (CONDEC-168)', () => {
  it('should create a decision knowledge issue via the create issue interface @requirement=CONDEC-168', async () => {
    // set up the firefox profile
    const options = new firefox.Options();
    options.setProfile(JSONConfig.firefoxProfilePath);

    const driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();

    // always wait for up to 10 seconds
    await driver.manage().setTimeouts({ implicit: 10000 });
    try {
      await driver.get(`${JSONConfig.fullUrl}/secure/CreateIssue!default.jspa`);

      // TODO: this will only work if Issue is already selected.
      // It should be replaced with a less volatile method
      // like an HTTP request to create a decision knowledge issue.
      await driver.findElement(By.id('issue-create-submit')).click(); // this clicks the next button

      // Write the name of the decision knowledge element
      await driver.findElement(By.id('summary')).sendKeys('Decision knowledge element 1');

      // click the create button
      await driver.findElement(By.id('issue-create-submit')).click();

      // make sure the created issue has the correct type
      chai.assert.equal(await driver.findElement(By.id('type-val')).getText(), 'Issue');
    } finally {
      driver.quit();
    }
  });
});
