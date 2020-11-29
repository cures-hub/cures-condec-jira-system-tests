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

TBD

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
