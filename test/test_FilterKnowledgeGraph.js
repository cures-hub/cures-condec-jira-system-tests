const chai = require('chai');
const {
  setUpJira,
  filterKnowledgeElements,
  createJiraIssue,
  jira,
  createDecisionKnowledgeElement,
} = require('./helpers');

/**
 * CONDEC-178: Filter knowledge graph
 */

describe('TCS: Test filter knowledge graph', () => {
  before(async () => {
    await setUpJira();
  });
  /**
   * TCS: Test filter knowledge graph should filter by summary of knowledge elements (R1)
   *
   * Precondition: A Jira issue exists. Two decision knowledge elements are
   * linked to the issue, each having a different summary
   *
   * Step 1: Apply a filter to filter for the issue
   *
   * Step 2: Verify there is only one result and that it is equal to the issue element
   *
   * Step 3: Apply a filter to filter for the alternative
   *
   * Step 4: Verify there is only one result and that it is equal to the alternative element
   *
   * Postcondition: Nothing changed. The filter only shows the element with the
   * provided summary text.
   */
  it('should filter by summary of knowledge elements (R1)', async () => {
    // Precondition: A Jira issue exists. Two decision knowledge elements are linked to the issue,
    // each having a different summary

    const jiraTask = await createJiraIssue('Task', 'Dummy');

    const issue = await createDecisionKnowledgeElement(
      'How should the phone number be stored?',
      'Issue',
      's',
      jiraTask.id,
      'i'
    );

    const alternative = await createDecisionKnowledgeElement(
      'Store the phone number as a string!',
      'Alternative',
      's',
      jiraTask.id,
      'i'
    );

    // Step 1: Apply a filter to filter for the issue
    const issueFilterResult = await filterKnowledgeElements({
      searchTerm: 'How should the phone number be stored?',
    });
    // Step 2: Verify there is only one result and that it is equal to the issue
    // element
    chai.expect(issueFilterResult).has.lengthOf(1);
    chai.expect(issueFilterResult[0]).to.be.eql(issue);

    // Step 3: Apply a filter to filter for the alternative
    const alternativeFilterResult = await filterKnowledgeElements({
      searchTerm: 'Store the phone number as a string!',
    });
    // Step 4: Verify there is only one result and that it is equal to the alternative
    // element
    chai.expect(alternativeFilterResult).has.lengthOf(1);
    chai.expect(alternativeFilterResult[0]).to.be.eql(alternative);
  });

  /**
   * TCS: Test filter knowledge graph should filter by knowledge type of knowledge elements (R1)
   *
   * Precondition:
   *
   * Step 1:
   *
   * Step 2:
   *
   * Postcondition:
   */
  it('should filter by knowledge type of knowledge elements (R1)');

  /**
   * TCS: Test filter knowledge graph
   *
   * Precondition:
   *
   * Step 1:
   *
   * Step 2:
   *
   * Postcondition:
   */
  it('should not show irrelevant text when using the default settings (R1)');

  /**
   * TCS: Test filter knowledge graph
   *
   * Precondition:
   *
   * Step 1:
   *
   * Step 2:
   *
   * Postcondition:
   */
  it('should filter by documentation location of elements (R1)');
});
