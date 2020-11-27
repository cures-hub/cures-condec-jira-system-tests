/* eslint-disable no-console */
/**
 * Set up the local Jira instance
 */
const axios = require('axios');
const { assert } = require('chai');
const JiraApi = require('jira-client');
const JSONConfig = require('../config.json');

const jira = new JiraApi({
  host: JSONConfig.baseUrl,
  port: JSONConfig.usePort,
  base: 'jira',
  strictSSL: false,
  username: JSONConfig.localJiraUsername,
  password: JSONConfig.localJiraPassword,
});

const localCredentialsObject = {
  auth: {
    username: JSONConfig.localJiraUsername,
    password: JSONConfig.localJiraPassword,
  },
};

const deleteProject = async (projectKeyOrId) => {
  await axios.delete(
    `${JSONConfig.fullUrl}/rest/api/2/project/${projectKeyOrId}`,
    localCredentialsObject,
  ).then((res) => assert(res.status === 204));
};

const activateConDec = async () => {
  await axios.post(
    `${JSONConfig.fullUrl}/rest/condec/latest/config/setActivated.json?projectKey=${JSONConfig.projectKey}&isActivated=true`,
    undefined, // no data in the body
    localCredentialsObject,
  ).then((res) => assert(res.status === 200));
};

const setIssueStrategy = async () => {
  await axios.post(
    `${JSONConfig.fullUrl}/rest/condec/latest/config/setIssueStrategy.json?projectKey=${JSONConfig.projectKey}&isIssueStrategy=true`,
    undefined, // no data in the body
    localCredentialsObject,
  ).then((res) => assert(res.status === 200));
};

/**
 * Creates a Jira issue with the project, user, and Jira instance configured in the `config.json`.
 * The user is used as the reporter of the issue.
 *
 * @param  {string} issueTypeName
 * @param  {string} issueSummary
 *
 */
const createJiraIssue = async (issueTypeName, issueSummary) => {
  const createdIssue = await jira.addNewIssue({
    fields: {
      project: {
        key: JSONConfig.projectKey,
      },
      summary: issueSummary,
      issuetype: {
        name: issueTypeName,
      },
      reporter: {
        name: JSONConfig.localJiraUsername,
      },
    },
  });
  console.log(`Created issue: ${createdIssue.key}`);
  return createdIssue;
};

const setUpJira = async () => {
  try {
    // delete existing project with the configured key (if it exists)
    const allProjects = await jira.listProjects();
    if (allProjects.some((elem) => elem.key === JSONConfig.projectKey)) {
      await deleteProject(JSONConfig.projectKey);
    }
    // create one new project with the configured key
    await jira.createProject({
      key: JSONConfig.projectKey,
      name: 'ConDec Test',
      projectTypeKey: 'business',
      projectTemplateKey: 'com.atlassian.jira-core-project-templates:jira-core-project-management',
      description: 'A project for testing the ConDec Jira plugin',
      lead: 'admin',
    });

    // activate ConDec
    await activateConDec();
    await setIssueStrategy();

    // add some issues
    await createJiraIssue('Task', 'Issue 1');
    await createJiraIssue('Task', 'Issue 2');
    await createJiraIssue('Task', 'Issue 3');
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports = {
  deleteProject, jira, setUpJira, createJiraIssue,
};
