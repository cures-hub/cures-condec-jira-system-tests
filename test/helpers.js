/* eslint-disable no-console */
/**
 * Set up the local Jira instance
 */
const axios = require('axios');
const { assert } = require('chai');
const JiraApi = require('jira-client');

// baseUrl, usePort, localJiraPassword, localJiraUsername, fullUrl, projectKey,
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
    undefined,
    localCredentialsObject,
  ).then((res) => assert(res.status === 200));
};
const setUpJira = async () => {
  try {
    // delete existing project with the configured key (if it exists)
    const allProjects = await jira.listProjects();
    if (allProjects.some((elem) => elem.key === JSONConfig.projectKey)) {
      await deleteProject(JSONConfig.projectKey);
    }
    // create one new project
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
    // TODO: improve issue adding

    await jira.addNewIssue({
      fields: {
        project: {
          key: JSONConfig.projectKey,
        },
        summary: 'Issue 1',
        issuetype: {
          name: 'Task',
        },
        reporter: {
          name: 'admin',
        },
      },
    });

    await jira.addNewIssue({
      fields: {
        project: {
          key: JSONConfig.projectKey,
        },
        summary: 'Issue 2',
        issuetype: {
          name: 'Task',
        },
        reporter: {
          name: 'admin',
        },
      },
    });
    await jira.addNewIssue({
      fields: {
        project: {
          key: JSONConfig.projectKey,
        },
        summary: 'Issue 3',
        issuetype: {
          name: 'Issue',
        },
        reporter: {
          name: 'admin',
        },
      },
    });

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
// setUpJira().then((res) => console.log(res)).catch((err) => { throw err; });

module.exports = {
  deleteProject, jira, setUpJira,
};
