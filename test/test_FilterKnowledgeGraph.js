const chai = require('chai');
const {
  setUpJira,
  filterKnowledgeElements,
  createJiraIssue,
  jira,
  createDecisionKnowledgeElement,
} = require('./helpers');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

/**
 * CONDEC-178: Filter knowledge graph
 */
describe('TCS: Test filter knowledge graph', () => {
  // Reset before each test case to make length assertions easier
  beforeEach(async () => {
    await setUpJira();
  });
  /**
   * TCS: Test filter knowledge graph should filter by summary of knowledge elements (R1)
   *
   * Precondition: A Jira issue exists. Two decision knowledge elements are
   * linked to the issue, each having a different summary
   *
   * Step 1: Apply a filter to filter for the issue by its summary
   *
   * Step 2: Verify there is only one result and that it is equal to the issue element
   *
   * Step 3: Apply a filter to filter for the alternative by its summary
   *
   * Step 4: Verify there is only one result and that it is equal to the alternative element
   *
   * Postcondition: Nothing changed. The filter only shows the element with the
   * provided summary text.
   */
  it('should filter by summary of knowledge elements (R1)', async () => {
    // Precondition: A Jira issue exists. Two decision knowledge elements are linked to the issue,
    // each having a different summary

    const jiraTask = await createJiraIssue('Task', 'Create a contact form');

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
   * Precondition: A Jira issue exists. Two decision knowledge elements are linked to the issue
   *
   * Step 1: Apply a filter to filter for the issue by its type
   *
   * Step 2: Verify there is only one result and that it is equal to the issue element
   * Step 3: Apply a filter to filter for the alternative by its type
   * Step 4: Verify there is only one result and that it is equal to the
   * alternative element
   * Postcondition: Nothing changed. The filter only shows elements with the
   * selected type
   */
  it('should filter by knowledge type of knowledge elements (R1)', async () => {
    // Precondition: A Jira issue exists. Two decision knowledge elements are linked to the issue
    const jiraTask = await createJiraIssue('Task', 'Create an about page');

    const issue = await createDecisionKnowledgeElement(
      'Whose picture should be put on the  about page?',
      'Issue',
      's',
      jiraTask.id,
      'i'
    );

    const alternative = await createDecisionKnowledgeElement(
      'Put a picture of each member of the dev team on the about page!',
      'Alternative',
      's',
      jiraTask.id,
      'i'
    );

    // Step 1: Apply a filter to filter for the issue by its type
    const issueFilterResult = await filterKnowledgeElements({
      knowledgeTypes: ['Issue'],
    });
    // Step 2: Verify there is only one result and that it is equal to the issue
    // element
    chai.expect(issueFilterResult).has.lengthOf(1);
    chai.expect(issueFilterResult[0]).to.be.eql(issue);

    // Step 3: Apply a filter to filter for the alternative by its type
    const alternativeFilterResult = await filterKnowledgeElements({
      knowledgeTypes: ['Alternative'],
    });
    // Step 4: Verify there is only one result and that it is equal to the alternative
    // element
    chai.expect(alternativeFilterResult).has.lengthOf(1);
    chai.expect(alternativeFilterResult[0]).to.be.eql(alternative);
  });

  /**
   * TCS: Test filter knowledge graph should not show irrelevant text when using the default settings (R1)
   *
   * Precondition: A knowledge element exists, containing text not marked as
   * decision knowledge
   *
   * Step 1: Apply the standard filter (no special settings) to the graph
   *
   * Step 2: Verify that the irrelevant text is not part of the filter output
   *
   * Postcondition: Nothing changed.
   */
  it('should not show irrelevant text when using the default settings (R1)', async () => {
    // Precondition: A knowledge element exists, containing text not marked as decision knowledge
    const jiraTask = await createJiraIssue('Task', 'Create order form');

    await jira.addComment(
      jiraTask.id,
      'We should probably anonymize the data we get from the order form. {issue}How can we anonymize data when parsing the order form?{issue}'
    );

    // Step 1: Apply the standard filter (no special settings) to the graph

    const filterResult = await filterKnowledgeElements({});

    // Step 2: Verify that the irrelevant text is not part of the filter output
    chai.expect(filterResult).to.not.contain.something.like({
      relevant: false,
      summary:
        'We should probably anonymize the data we get from the order form.',
    });
  });
});
