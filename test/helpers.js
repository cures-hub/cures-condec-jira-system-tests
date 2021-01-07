/* eslint-disable no-console */

/**
 * Helper functions for the ConDec Jira system tests
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
const base64LocalCredentials = Buffer.from(
  `${JSONConfig.localJiraUsername}:${JSONConfig.localJiraPassword}`,
  'binary'
).toString('base64');
/**
 * Delete a Jira project on the configured Jira instance
 *
 * @param  {string} projectKeyOrId
 */
const deleteProject = async (projectKeyOrId) => {
  await axios
    .delete(
      `${JSONConfig.fullUrl}/rest/api/2/project/${projectKeyOrId}`,
      localCredentialsObject
    )
    .then((res) => assert(res.status === 204));
};

/**
 * Get all configured issue types
 */
const getIssueTypes = async () => {
  const issueTypes = await axios.get(
    `${JSONConfig.fullUrl}/rest/api/2/issuetype`,
    localCredentialsObject
  );
  return issueTypes.data;
};
/**
 * Activate the ConDec plugin for the configured Jira instance.
 *
 * Note that since this function calls the ConDec REST API,
 * it will only work if the ConDec plugin has been activated manually on the instance before.
 */
const activateConDec = async () => {
  await axios
    .post(
      `${JSONConfig.fullUrl}/rest/condec/latest/config/setActivated.json?projectKey=${JSONConfig.projectKey}&isActivated=true`,
      undefined, // no data in the body
      localCredentialsObject
    )
    .then((res) => assert(res.status === 200));
};

/**
 * Set whether the ConDec plugin should use Jira issue types for decision knowledge
 *
 * @param  {boolean} useIssueStrategy
 */
const setIssueStrategy = async (useIssueStrategy) => {
  await axios
    .post(
      `${JSONConfig.fullUrl}/rest/condec/latest/config/setIssueStrategy.json?projectKey=${JSONConfig.projectKey}&isIssueStrategy=${useIssueStrategy}`,
      undefined, // no data in the body
      localCredentialsObject
    )
    .then((res) => assert(res.status === 200));
};

/**
 * Creates a Jira issue with the project, user, and Jira instance configured in the `config.json`.
 * The user is used as the reporter of the issue.
 *
 * @param  {string} issueTypeName - must be a valid Jira issue type for the configured instance
 * @param  {string} issueSummary
 * @param  {?string} issueDescription - optional - if not specified, the issue description will be empty
 *
 */
const createJiraIssue = async (
  issueTypeName,
  issueSummary,
  issueDescription = ''
) => {
  const createdIssue = await jira.addNewIssue({
    fields: {
      project: {
        key: JSONConfig.projectKey,
      },
      summary: issueSummary,
      description: issueDescription,
      issuetype: {
        name: issueTypeName,
      },
      reporter: {
        name: JSONConfig.localJiraUsername,
      },
    },
  });
  console.info(`Created issue: ${createdIssue.key}`);
  return createdIssue;
};
/**
 * Set up the configured Jira instance in order to be able to run system tests against it.
 *
 * @param  {boolean} useIssueStrategy=false - if set to true, the project will be set up to use the
 * issue persistence strategy
 */
const setUpJira = async (useIssueStrategy = false) => {
  console.info('Setting up jira...');
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
      projectTemplateKey:
        'com.atlassian.jira-core-project-templates:jira-core-project-management',
      description: 'A project for testing the ConDec Jira plugin',
      lead: 'admin',
    });

    // activate ConDec
    await activateConDec();
    // explicitly set whether to use the issue persistence strategy or not
    await setIssueStrategy(useIssueStrategy);

    console.info('Successfully set up Jira!');
  } catch (err) {
    console.error(err);
    throw err;
  }
};
/**
 * Get all the knowledge elements via the ConDec REST API
 *
 * @param {string} searchTerm=''
 */
const getKnowledgeElements = async (searchTerm = '') => {
  try {
    const results = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      { projectKey: JSONConfig.projectKey, searchTerm },
      localCredentialsObject
    );
    return results.data;
  } catch (err) {
    console.error(err);
    throw new Error('Getting knowledge elements did not work');
  }
};
/**
 * 
 * @param {string} newElementSummary - a summary for the new element
 * @param {string} newElementType - the type of the new element - must be a valid
 * type active on the Jira instance. Valid values include 'Alternative',
 * 'Decision', 'Issue', 'Pro', 'Con'
 * @param {string} newElementLocation - i or s. i creates an issue, s creates an
 * issue comment
 * @param {?string} newElementDescription - optional, empty if not specified.
 * @param {?number|string} existingElementId - optional. If specified, must be number or string representing the
 * id of the existing element to link to. If not specified, the new element will
 * not be linked.
 * @param {?string} existingElementLocation - optional. If specified, must be i
 * or s, depending on the location of the existing element. If not specified,
 * the new element will not be linked to an existing element
 */
const createDecisionKnowledgeElement = async (
  newElementSummary,
  newElementType,
  newElementLocation,
  existingElementId=0,
  existingElementLocation=null,
  newElementDescription = ''
) => {
  try {
    const result = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/` +
        'createDecisionKnowledgeElement.json' +
        `?idOfExistingElement=${existingElementId}` +
        `&documentationLocationOfExistingElement=${existingElementLocation}`,
      {
        summary: newElementSummary,
        type: newElementType,
        projectKey: JSONConfig.projectKey,
        description: newElementDescription,
        documentationLocation: newElementLocation,
      }, localCredentialsObject
    );
    return result.data;
  } catch (err) {
    console.error(err);
    throw new Error(
      `Creation of decision knowledge element with summary ${newElementSummary} failed with message: ${err.message}`
    );
  }
};
module.exports = {
  deleteProject,
  jira,
  setUpJira,
  createJiraIssue,
  getIssueTypes,
  localCredentialsObject,
  base64LocalCredentials,
  getKnowledgeElements,
  createDecisionKnowledgeElement,
};
