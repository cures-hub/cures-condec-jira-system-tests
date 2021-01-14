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
 * Delete a decision knowledge element
 *
 * @param {number|string} id
 * @param {string} documentationLocation - 'i' or 's', depending on the location of
 * the element to remove
 */
const deleteDecisionKnowledgeElement = async (id, documentationLocation) => {
  const deletionRequestPayload = {
    method: 'delete',
    url: `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/deleteDecisionKnowledgeElement.json`,
    headers: {
      Authorization: `Basic ${base64LocalCredentials}`,
      'Content-Type': 'application/json',
    },
    data: {
      id,
      projectKey: JSONConfig.projectKey,
      documentationLocation,
    },
  };
  try {
    const result = await axios.request(deletionRequestPayload);
    return result.data;
  } catch (err) {
    return err;
  }
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
  return createdIssue;
};

/**
 * Set decision knowledge in a sentence (comment or Jira issue description) as irrelevant
 * @param {string|number} sentenceId
 */
const setSentenceIrrelevant = async (sentenceId) => {
  try {
    await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/setSentenceIrrelevant.json`,
      {
        projectKey: JSONConfig.projectKey,
        documentationLocation: 's',
        id: String(sentenceId),
      },
      localCredentialsObject
    );
  } catch (err) {
    console.error(err.message);
    throw err;
  }
};

/**
 * Set up the configured Jira instance in order to be able to run system tests against it.
 *
 * @param  {boolean} useIssueStrategy=false - if set to true, the project will be set up to use the
 * issue persistence strategy
 */
const setUpJira = async (useIssueStrategy = false) => {
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
const getKnowledgeElements = async (
  searchTerm = '',
  selectedElement = null
) => {
  try {
    const results = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      { projectKey: JSONConfig.projectKey, searchTerm, selectedElement },
      localCredentialsObject
    );
    return results.data;
  } catch (err) {
    console.error(err);
    throw new Error('Getting knowledge elements did not work');
  }
};
/**
 * Get knowledge elements matching certain filter settings
 *
 * @param {Object} filterSettings
 */
const filterKnowledgeElements = async (filterSettings) => {
  try {
    Object.assign(filterSettings, {
      projectKey: JSONConfig.projectKey,
    });

    const results = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/knowledgeElements.json`,
      filterSettings,
      localCredentialsObject
    );
    return results.data;
  } catch (err) {
    console.error(err);
    return err;
  }
};
const getSpecificKnowledgeElement = async (id, documentationLocation) => {
  try {
    const result = await axios.get(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge/` +
        'getDecisionKnowledgeElement.json' +
        `?projectKey=${JSONConfig.projectKey}` +
        `&id=${id}` +
        `&documentationLocation=${documentationLocation}`,

      localCredentialsObject
    );
    return result.data;
  } catch (err) {
    console.error(err.message);
    throw new Error(`An error occurred while getting element with id ${id}`);
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
 * @param {?number|string} existingElementId - optional. If specified, must be number or string representing the
 * id of the existing element to link to. If not specified, the new element will
 * not be linked.
 * @param {?string} existingElementLocation - optional. If specified, must be i
 * or s, depending on the location of the existing element. If not specified,
 * the new element will not be linked to an existing element
 * @param {?string} newElementDescription - optional, empty if not specified.
 */
const createDecisionKnowledgeElement = async (
  newElementSummary,
  newElementType,
  newElementLocation,
  existingElementId = 0,
  existingElementLocation = null,
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
      },
      localCredentialsObject
    );
    return result.data;
  } catch (err) {
    console.error(err);
    throw new Error(
      `Creation of decision knowledge element with summary ${newElementSummary} failed with message: ${err.message}`
    );
  }
};

/**
 *
 * @param {number | string} parentElementId
 * @param {string} parentElementLocation
 * @param {Object} updatedElement - should contain the element with properties
 * to update set
 *
 * @returns {Promise<Object>}
 */
const updateDecisionKnowledgeElement = async (
  parentElementId,
  parentElementLocation,
  updatedElement
) => {
  try {
    const res = await axios.post(
      `${JSONConfig.fullUrl}/rest/condec/latest/knowledge` +
        `/updateDecisionKnowledgeElement.json?idOfParentElement=${parentElementId}&documentationLocationOfParentElement=${parentElementLocation}`,
      {
        id: updatedElement.id,
        summary: updatedElement.summary,
        type: updatedElement.type,
        projectKey: JSONConfig.projectKey,
        description: updatedElement.description,
        documentationLocation: updatedElement.documentationLocation,
        status: updatedElement.status,
      },
      localCredentialsObject
    );
    return res.data;
  } catch (err) {
    console.error(err.message);
    return err;
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
  updateDecisionKnowledgeElement,
  getSpecificKnowledgeElement,
  setSentenceIrrelevant,
  deleteDecisionKnowledgeElement,
  filterKnowledgeElements,
};
