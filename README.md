# ConDec System Tests

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e2ed5ab4866a41e4b4a21e132e84152e)](https://app.codacy.com/gh/cures-hub/cures-condec-jira-system-tests?utm_source=github.com&utm_medium=referral&utm_content=cures-hub/cures-condec-jira-system-tests&utm_campaign=Badge_Grade_Settings)

This repo contains system tests for the ConDec Jira plugin. The tests run by
sending HTTP requests to a Jira instance running the ConDec plugin. The tests
aim to test the most important functionalities of the ConDec plugin.

## Requirements

To run these tests, you will need a recent version of `node` (this was tested using node version 12) and `npm`.

To get all dependencies of the repo, run

```bash
npm install
```

### Adding your local configuration to the repo

You will need to copy the file `config-template.json` and name the copy `config.json`. In `config.json`
you can change the settings to use a specific URL for Jira or a specific user.
**Do not push the `config.json` file!** It contains data local to your computer,
which could be sensitive!



## Running the tests

Checklist:

- [ ] (optional) run atlas-clean to clean the Jira database
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

If you want to write new automated system tests, you should read this section!

### Conventions

- Tests should be in a `describe` block in the form `describe('TCS:
  CONDEC-000')`, where you replace CONDEC-000 with the Jira issue key for the
  system function you are testing.
- inside the describe block, there should be an `it` block for each test case.
  The `it` block should be named after the rule or exception you are testing
  (these can be found in the corresponding Jira issues).
  - If the rule contains multiple options for testing, you can split the tests
    into multiple test cases, where each test case has its own `it` block that
    describes which part it tests.
- Each test file should include a before method that calls the `setUpJira`
  function - this is how we can be sure Jira is set up and the ConDec plugin is
  reset.
  
### Technology stack

- [Mocha](https://mochajs.org/) - test runner
- [chai](https://www.chaijs.com/) - assertion library, provides assertion
  chaining and test fixtures
  - we also use the chai plugins [chai-like] and [chai-things], to allow easy
    assertions for parts of an array and subsets of an object
- [axios](https://github.com/axios/axios#axios) - HTTP request module
- [node-jira-client API reference](https://jira-node.github.io/class/src/jira.js~JiraApi.html#instance-method-doRequest)
  - The Node Jira client provides an easy way to access a lot of Jira API
  endpoints without having to send them with axios.
- [Official Jira API reference](https://docs.atlassian.com/software/jira/docs/api/REST/latest/)

### Things to pay attention to

- Each test should be atomic - it should not depend on data or objects from other test cases
- If you are trying to find the path to a HTML artifact on Jira, or the REST API
  endpoint that is called when you click a button, it can help to use the web
  inspector (Ctrl-Shift-C on Firefox) and view the HTTP requests in the console.
