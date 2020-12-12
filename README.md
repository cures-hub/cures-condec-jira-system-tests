# ConDec System Tests

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e2ed5ab4866a41e4b4a21e132e84152e)](https://app.codacy.com/gh/cures-hub/cures-condec-jira-system-tests?utm_source=github.com&utm_medium=referral&utm_content=cures-hub/cures-condec-jira-system-tests&utm_campaign=Badge_Grade_Settings)

This repo contains system tests for the ConDec Jira plugin. The tests run using Selenium and
Geckodriver (the Firefox driver for Selenium), and send HTTP request mainly using axios.

## Requirements

To run these tests, you will need a recent version of `node` (this was tested using node version 12) and `npm`.

To get all dependencies of the repo, run

```bash
npm install
```

## Setting up Selenium

TODO: check if npm install is enough, or if the selenium binaries need to be installed separately

### Adding your local configuration to the repo

You will need to copy the file `config-template.json` and name the copy `config.json`. In `config.json`
you should save the path to your Firefox selenium tester profile (see instructions below).
**Do not push the `config.json` file!** It contains data local to your computer.

### Setting up a Firefox profile

1. Start a local Jira instance by running `atlas-run` in the ConDec plugin source folder. It should start up on port 2990. This will take a while so you can continue with creating a new profile in the meantime.
2. Open up Firefox and type in the search bar about:profiles.
3. Create a new profile, for example with the name SeleniumTester. Copy the path of the "Root
   directory" to your `config.json` file, in the value field of `firefoxProfilePath`.
4. Click on `Launch profile in new browser` for the new profile. This will open a new firefox window.
5. Now you will set your new profile to not remember history. This is necessary so that the profile
   does not grow too large, which would cause the tests to become excruciatingly slow. So, in your
   new firefox window, running with the newly created profile, navigate to `about:preferences#privacy`.
   Scroll down to the part called `History` and click `Use custom settings for history`. Then
   click the `Settings...` button on the right, and change the settings so that firefox will clear
   `Browsing & Download History`, `Cache`, and `Form & Search History`.
6. Once your Jira instance is running, navigate to `localhost:2990/jira` (using the same Firefox
   window you just set up.).
7. Then log in using username: `admin` password: `admin`.
8. Make sure to click on `Remember my login on this computer`.
9. Make sure the ConDec plugin is enabled. To enable ConDec, you will probably have to click on disable and then enable once on the apps screen.

### Starting ConDec Jira

Checklist:

- [ ] Run Jira using `atlas-run`
- [ ] Activate the ConDec plugin
- [ ] Make sure your firefox testing profile has the Jira username and password saved

## Running the tests

You are now ready to run the tests!

### Run all the tests

```bash
npm test
```

or

```bash
npm start
```

(both commands run the tests)

### Run just one file

```bash
npm test -- path/to/your/test/file
```

### Run just one test case

add `.only()` to your test case definition

Example:

```bash
it.only('should do stuff' () => {
  ...
});
```

(**Do not commit/push** tests using `.only()`, this will stop all the other tests from running)

## Upload results to Jira/XRay

To create a report for uploading to Jira/XRay, run

```bash
npm run report
```

To upload the report to XRay, open the test execution issue you want to add the results to. Press
the `.` button and search for `Import execution results`.

## Writing new tests

If you want to write new automated system tests, you should read this section.

### Technology stack

- `Mocha.js` - test runner
- `chai` - provides assertions and test fixtures
- Selenium WebDriver (Geckodriver) - Drives the Firefox browser
  - Uses the selenium API for NodeJS
- `jira-client` library - this is a library that provides a convenient way to send HTTP requests to
  Jira.
- `axios` - Unfortunately the jira-client doesn't cover all of the Jira REST API (or the ConDec REST
  API), so we use axios for other REST calls.

### Things to pay attention to

- Each test should be atomic - it should not depend on data or objects from other test cases
- A lot of things can be tested via the REST API and don't require graphical tests
- If you want to test the GUI, use a fresh webdriver object for every test case, or at least for
  every `describe` block
- WebDriver is slow. It should be used as sparingly as possible. If your test case requires setup,
  try to do as much as possibly of it using HTTP calls
- If you are trying to find the path to a HTML artifact on Jira, it can help to use the web
  inspector (Ctrl-Shift-C on Firefox)

### Useful links

- [chai](https://www.chaijs.com/)
- [Mocha](https://mochajs.org/)
- [Selenium NodeJS API](https://www.selenium.dev/selenium/docs/api/javascript/)
- [axios](https://github.com/axios/axios#axios)
- [xpath cheetsheet](https://devhints.io/xpath)
- [node-jira-client API reference](https://jira-node.github.io/class/src/jira.js~JiraApi.html#instance-method-doRequest)
- [Official Jira API reference](https://docs.atlassian.com/software/jira/docs/api/REST/latest/)
