const chai = require('chai');
const { By, Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const { setUpJira, createJiraIssue } = require('./helpers.js');

describe('TCS: CONDEC-168', () => {
  before(async () => {
    // explicitly use issue persistence strategy here
    setUpJira(true);
  });
  it(
    '(R1) If the decision knowledge element is created within an existing knowledge element ' +
      '(Jira issue or code file), a link is created between an existing knowledge' +
      ' element and the new element (CONDEC-291). '
  );
  it(
    '(R2) If the documentation location of the new decision knowledge element is "Jira issue' +
      'text", a new comment in an existing Jira issue is created, which contains the new decision' +
      'knowledge element. '
  );
  it('(R3) A new alternative has the status "idea".');
  it('(R4) A new decision has the status "decided".');
  it(
    '(R5) A new issue (=decision problem), i.e. an issue without linked decision has' +
      'the status "unresolved".'
  );
  it(
    '(R6) A Jira issue (i.e. a decision knowledge element documented as an entire Jira issue) can' +
      'only be created in a view on the knowledge graph if the user has the rights to create Jira' +
      'issues (CONDEC-852, integrity).'
  );
  it('(R7) If the webhook is activated, it will be fired (CONDEC-185).');
  it('(E1) A decision knowledge element with the same id already exists.');
  it('(E2) The user does not have the rights for creation.');
  xit('should create a decision knowledge issue via the create issue interface', async () => {
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
