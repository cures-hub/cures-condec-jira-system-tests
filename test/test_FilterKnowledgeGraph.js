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
   * System function: Filter knowledge graph
   * Precondition system: A Jira issue exists. Two decision knowledge elements are linked to the issue, each having a different summary
   * Precondition GUI: W1.3, WS1.4 or WS1.5
   * Step 1: Apply a filter to filter for the first knowledge element by its summary
   * Expected result on GUI: Only the element with the summary that was filtered is shown
   * Expected exception: None
   * Postcondition system: Nothing changed
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

    await createDecisionKnowledgeElement('Store the phone number as a string!', 'Alternative', 's', jiraTask.id, 'i');

    const issueFilterResult = await filterKnowledgeElements({
      searchTerm: 'How should the phone number be stored?',
    });

    chai.expect(issueFilterResult).has.lengthOf(1);
    chai.expect(issueFilterResult[0]).to.be.eql(issue);
  });

  /**
   * TCS: Test filter knowledge graph should filter by knowledge type of knowledge elements (R1)
   *
   * System function: Filter knowledge graph
   * Precondition system: A Jira issue exists. An issue and an alternative are linked to the Jira issue.
   * Precondition GUI: W1.3, WS1.4 or WS1.5
   * Step 1: Apply a filter to filter for the issue by its type
   * Step 2: Apply a filter to filter for the alternative by its type
   * Expected result on GUI: Filtering for the issue removes the alternative from the view of the knowledge graph, and vice versa
   * Expected exception: None
   * Postcondition system: Nothing changed
   */
  it('should filter by knowledge type of knowledge elements (R1)', async () => {
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

    const issueFilterResult = await filterKnowledgeElements({
      knowledgeTypes: ['Issue'],
    });
    chai.expect(issueFilterResult).has.lengthOf(1);
    chai.expect(issueFilterResult[0]).to.be.eql(issue);

    const alternativeFilterResult = await filterKnowledgeElements({
      knowledgeTypes: ['Alternative'],
    });

    chai.expect(alternativeFilterResult).has.lengthOf(1);
    chai.expect(alternativeFilterResult[0]).to.be.eql(alternative);
  });

  /**
   * TCS: Test filter knowledge graph should not show irrelevant text when using the default settings (R1)
   *
   * Precondition system: A knowledge element exists, containing text not marked as decision knowledge
   * Precondition GUI: W1.3, WS1.4 or WS1.5
   * Step 1: Apply the standard filter (no special settings) to the graph
   * Expected result on GUI: The irrelevant text is not shown on the knowledge graph
   * Expected exception: None
   * Postcondition system: Nothing changed
   */
  it('should not show irrelevant text when using the default settings (R1)', async () => {
    // Precondition: A knowledge element exists, containing text not marked as decision knowledge
    const jiraTask = await createJiraIssue('Task', 'Create order form');

    await jira.addComment(
      jiraTask.id,
      'We should probably anonymize the data we get from the order form. {issue}How can we anonymize data when parsing the order form?{issue}'
    );

    const filterResult = await filterKnowledgeElements({});

    chai.expect(filterResult).to.not.contain.something.like({
      relevant: false,
      summary: 'We should probably anonymize the data we get from the order form.',
    });
  });
});
