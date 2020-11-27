# ConDec System Tests

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e2ed5ab4866a41e4b4a21e132e84152e)](https://app.codacy.com/gh/cures-hub/cures-condec-jira-system-tests?utm_source=github.com&utm_medium=referral&utm_content=cures-hub/cures-condec-jira-system-tests&utm_campaign=Badge_Grade_Settings)

This repo contains system tests for the ConDec Jira plugin. The tests run using Selenium and
Geckodriver (the Firefox driver for Selenium).

## Requirements

To run these tests, you will need a recent version of `node` (this was tested using node version 12) and `npm`.

To get all dependencies of the repo, run

```bash
npm install
```

### Setting up Selenium

To set up Selenium, install the Selenium and Geckodriver binaries.

### Setting up a Firefox profile

### Adding your configuration

You will need to copy the file `config-template.json` and name the copy `config.json`. In `config.json`
you should save the path to your Firefox selenium tester profile (see instructions above).
**Do not push the `config.json` file!** It contains data local to your computer.


### Starting ConDec Jira

Checklist:

- [ ] Run Jira using `atlas-run`
- [ ] Activate the ConDec plugin
- [ ] Make sure your firefox testing profile has the Jira username and password saved

## Running the tests

You are now ready to run the tests!

Run the tests using

```bash
npm test
```

or

```bash
npm start
```

(both commands run the tests)

## Upload results to Jira/XRay

To create a report for uploading to Jira/XRay, run

```bash
npm run report
```

To upload, use the provided script (TODO: provide a script :smile:)
