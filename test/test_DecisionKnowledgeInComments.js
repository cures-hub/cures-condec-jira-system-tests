const chai = require('chai');
const { By, Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const JSONConfig = require('../config.json');
const { jira, setUpJira, createJiraIssue } = require('./helpers.js');

describe('TCS: CONDEC-123', () => {
  before(async () => {
    await setUpJira();
  });
});
