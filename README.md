# ConDec System Tests

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e2ed5ab4866a41e4b4a21e132e84152e)](https://app.codacy.com/gh/cures-hub/cures-condec-jira-system-tests?utm_source=github.com&utm_medium=referral&utm_content=cures-hub/cures-condec-jira-system-tests&utm_campaign=Badge_Grade_Settings)

This repo contains system tests for the ConDec Jira plugin. The tests run by sending HTTP requests to a Jira instance running the ConDec plugin. The tests aim to test the most important functionalities of the ConDec plugin.

## Requirements

To run these tests, you will need a recent version of `node` (this was tested using node version 12) and `npm`.

To get all dependencies of the repo, run

```bash
npm install
```

### Adding your local configuration to the repo

You will need to copy the file `config-template.json` and name the copy `config.json`. In `config.json` you can change the settings to use a specific URL for Jira or a specific user.
**Do not push the `config.json` file!** It contains data local to your computer, which could be sensitive!

## Running the tests

Checklist:

- [ ] (optional) run `atlas-clean` to clean the Jira database
- [ ] Run Jira using `atlas-run`
- [ ] Disable and then enable the ConDec plugin

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

### Run just one `it` or `describe`

Add `.only()` to your `it` or `describe` block

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

To upload the report to XRay, open the test execution issue you want to add the results to. Press the `.` button and search for `Import execution results`.

This will update the Jira issues of existing tests, and add new issues for new tests

## Writing new tests

If you want to write new automated system tests, you should read this section!

### Conventions

- Tests should be in a `describe` block in the form `describe('TCS: Test <SF NAME>')`, where you replace `<SF NAME>` with the name of the system function you are testing.
  
- Each `describe` should include a `before` method that calls the `setUpJira` function - this is how we can be sure Jira is set up and the ConDec plugin is reset.
  
- inside the describe block, there should be an `it` block for each test case. The `it` block should be named using should/when syntax describing the rule or exception you are testing. The rule or exception number should be added to the end of the name.

  Example:
  `it('should create a new comment for an existing Jira issue when the documentation location "Jira issue text" is selected (R2)'`

- Each test should have a multiline comment preceding it indicating its specification. It should include preconditions, test steps, and postconditions, and should look something like this:

  ```javascript
  /**
   * TCS: Test create decision knowledge element should give a new decision the status "decided" (R4)
   *
   * System function: Create decision knowledge element
   * Precondition system: Decision knowledge element with type issue exists
   * Precondition GUI: WS1.3 (Decision knowledge view) or WS1.4 (Jira issue view)
   * Test steps:
      1. Create a new decision for the issue
   * Expected result on GUI: The decision is visible on the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The new decision has the status 'decided'
   */
  ```
### Technology stack

- [Mocha](https://mochajs.org/) - test runner
- [chai](https://www.chaijs.com/) - assertion library, provides assertion chaining and test fixtures
  - we also use the chai plugins [chai-like](https://www.chaijs.com/plugins/chai-like/) and [chai-things](https://www.chaijs.com/plugins/chai-things/), to allow easy assertions for elements of an array and subsets of an object
- [axios](https://github.com/axios/axios#axios) - HTTP request module
- [node-jira-client API reference](https://jira-node.github.io/class/src/jira.js~JiraApi.html#instance-method-doRequest)
  - The Node Jira client provides an easy way to access a lot of Jira API endpoints without having to send them with axios.
- [Official Jira API reference](https://docs.atlassian.com/software/jira/docs/api/REST/latest/)

### Things to pay attention to

- Each test should be atomic - it should not depend on data or objects from other test cases
- If you are trying to find the path to a HTML artifact on Jira, or the REST API endpoint that is called when you click a button, it can help to use the web inspector (Ctrl-Shift-C on Firefox) and view the HTTP requests in the console.
