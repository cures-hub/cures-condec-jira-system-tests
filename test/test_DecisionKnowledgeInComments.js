const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  getKnowledgeElements,
  setSentenceIrrelevant,
  createDecisionKnowledgeElement,
  getSpecificKnowledgeElement,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));
/**
 * CONDEC-123: Manually classify text in the description or comments of a Jira issue as decision knowledge
 *
 * For readability we shorten the name to "Manually classify text as decision
 * knowledge" here
 */
describe('TCS: Test manually classify text as decision knowledge', () => {
  before(async () => {
    await setUpJira();
  });

  /**
   * TCS: Test manually classify text as decision knowledge should classify elements in specific macro tags as decision knowledge (R1)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Add a comment to the jira issue containing the macro tags: {issue},
   * {decision}, {alternative}, {pro}, {con} (see below for example)
   *
   * Step 2: Verify that the knowledge elements are stored in the ConDec database
   *
   * Postcondition: The knowledge elements are stored in the ConDec database
   */
  it(// This is currently failing, see bugs: CONDEC-857 and CONDEC-858
  'should classify elements in specific macro tags as decision knowledge (R1)', async () => {
    /*
    The macro tags are:
      - {issue} How to implement ...? {issue}
      - {decision} Use ... to implement ...! {decision}
      - {alternative} Use ... to implement ...! {alternative}
      - {pro} Improves security. {pro}
      - {con} Reduces usability. {con}
     */

    // Precondition: Jira issue exists
    const issue1 = await createJiraIssue(
      'Task',
      'Create a blog page for the Moo company'
    );

    // Step 1: Add a comment to the jira issue containing the macro tags
    await jira.addComment(
      issue1.id,
      '{issue}Which site generator should be used to make the blog?{issue}\n' +
        '{decision}Use Jekyll to make the blog!{decision}\n' +
        '{pro}Jekyll is free{pro}\n' +
        '{con}Jekyll has a learning curve{con}\n' +
        '{alternative}Use WordPress to make the blog!{alternative}\n'
    );
    // Step 2: Verify that the knowledge elements are stored in the ConDec database
    const knowledgeElements1 = await getKnowledgeElements('', issue1.key);

    const expectedPartialElements = [
      {
        type: 'Issue',
        summary: 'Which site generator should be used to make the blog?',
      },
      {
        type: 'Decision',
        summary: 'Use Jekyll to make the blog!',
      },
      {
        type: 'Pro',
        summary: 'Jekyll is free',
      },
      {
        type: 'Con',
        summary: 'Jekyll has a learning curve',
      },
      {
        type: 'Alternative',
        summary: 'Use WordPress to make the blog!',
      },
    ];

    expectedPartialElements.forEach((partialElement) => {
      chai.expect(knowledgeElements1).to.contain.something.like(partialElement);
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge should classify elements marked with specific Jira icons as decision knowledge (R1)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Add a Jira issue comment
   *
   * Step 2: Verify the elements from the comment are stored as decision knowledge in the ConDec database
   *
   * Postcondition: The elements from the comment are stored as decision knowledge in the ConDec database
   */
  it(// This is currently failing, see bugs: CONDEC-857 and CONDEC-858
  'should classify elements marked with specific Jira icons as decision knowledge (R1)', async () => {
    /*
    The icons are:
    (!) - issue
    (/) - decision
    (on) - alternative
    (+) - pro
    (-) - con
     */

    // Precondition: Jira issue exists
    const issue2 = await createJiraIssue(
      'Task',
      'Decide on the domain name for the blog'
    );
    // Step 1: add a comment containing manually classified decision knowledge
    // with Jira icons
    await jira.addComment(
      issue2.id,
      '(!) Which domain registrar should be used?\n' +
        '(/) Use openSRS for registering the domain name!\n' +
        '(+) OpenSRS has low fees\n' +
        '(on) Use GoDaddy for registering the domain name!\n' +
        '(-) GoDaddy has high fees'
    );
    // Step 2: Verify the elements from the comment are stored as decision
    // knowledge in the ConDec database
    const knowledgeElements2 = await getKnowledgeElements('', issue2.key);
    const expectedPartialElements = [
      {
        type: 'Issue',
        summary: 'Which domain registrar should be used?',
      },
      {
        type: 'Decision',
        summary: 'Use openSRS for registering the domain name!',
      },
      {
        type: 'Pro',
        summary: 'OpenSRS has low fees',
      },
      {
        type: 'Con',
        summary: 'GoDaddy has high fees',
      },
      {
        type: 'Alternative',
        summary: 'Use GoDaddy for registering the domain name!',
      },
    ];

    expectedPartialElements.forEach((partialElement) => {
      chai.expect(knowledgeElements2).to.contain.something.like(partialElement);
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge should replace Jira icons with macro tags in Jira issue comments (R2)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Add a comment to the Jira issue containing decision knowledge marked by Jira icons
   *
   * Step 2: Verify that the text of the comment has changed to use the macro syntax
   *
   * Postcondition: The text of the comment has changed to use the macro syntax
   */
  it('should replace Jira icons with macro tags in Jira issue comments (R2)', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue('Task', 'Enable website navigation');

    // Step 1: Add a comment to the Jira issue containing decision knowledge
    // marked by Jira icons
    await jira.addComment(
      issue.id,
      '(!) Should we add a back button to the website?' +
        '(on) Add a back button that is visible on the same spot on every page'
    );

    // Step 2: Verify that the text of the comment has changed to use the macro syntax
    const issueAfterCommenting = await jira.findIssue(issue.id);
    chai
      .expect(issueAfterCommenting.fields.comment.comments[0])
      .to.have.property(
        'body',
        '{issue} Should we add a back button to the website?{issue}{alternative} Add a back button that is visible on the same spot on every page{alternative}'
      );
  });

  /**
   * TCS: Test manually classify text as decision knowledge'should set knowledge type of parts of a sentence not annotated as decision knowledge to "other" and property "relevant" to false (R4)
   *
   * Precondition: Jira issue exists
   *
   * Step 1: Add a comment to the Jira issue containing some decision knowledge
   *     elements and some text not marked as decision knowledge
   *
   * Step 2: Verify that the knowledge type of the untagged part of the sentence
   *     is 'other' and the 'relevant' property of the element is set to false
   *
   * Postcondition: The knowledge type of the untagged part of the sentence is 'other'
   *     and the 'relevant' property of the element is set to false
   *
   */
  // This is currently failing because non-classified text in comments is
  // ignored and not added to the knowledge graph.
  it('should set knowledge type of parts of a sentence not annotated as decision knowledge to other and property relevant to false (R4)', async () => {
    // Precondition: Jira issue exists
    const issue = await createJiraIssue('Task', 'Enhance user experience');

    // Step 1: Add a comment to the Jira issue containing some decision
    // knowledge elements and some text not marked as decision knowledge
    await jira.addComment(
      issue.id,
      "I don't think we should use cookies to track our users.\n{issue}How can we enhance user experience without compromising privacy?{issue}"
    );

    // Step 2: Verify that the knowledge type of the untagged part of the
    // sentence is 'other' and the 'relevant' property of the element is set to false
    const knowledgeElements = await getKnowledgeElements('', issue.key);

    chai.expect(knowledgeElements).to.contain.something.like({
      summary: "I don't think we should use cookies to track our users.",
      relevant: 'false',
      type: 'Other',
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge
   *
   * Precondition: Jira issue exists and has a comment containing a decision knowledge element
   *
   * Step 1: Set the sentence as irrelevant on a view on the knowledge graph
   *     (=call the REST endpoint setSentenceIrrelevant)
   *
   * Step 2: Verify that the knowledge element in the comment no longer contains the macro tags
   *
   * Postcondition: Verify that the knowledge element in the comment no longer
   *     contains the macro tags
   */
  it('should remove macro tags from a manually annotated Jira comment when it is marked as irrelevant in a view on the knowledge graph (R5)', async () => {
    // Precondition: Jira issue exists and has a comment containing a decision knowledge element
    const jiraIssue = await createJiraIssue('Task', 'Implement dark mode');
    const decisionKnowledgeElement = await createDecisionKnowledgeElement(
      'Should the default text be green?',
      'Issue',
      's',
      jiraIssue.id,
      'i'
    );
    // Step 1: Set the knowledge elelemnt as irrelevant on a view on the knowledge graph (=call the REST endpoint setSentenceIrrelevant)
    await setSentenceIrrelevant(decisionKnowledgeElement.id);
    // Step 2: Verify that the knowledge element in the comment no longer
    // contains the macro tags
    const decisionKnowledgeElementAfterUpdate = await getSpecificKnowledgeElement(
      decisionKnowledgeElement.id,
      's'
    );
    chai.expect(decisionKnowledgeElementAfterUpdate.type).to.eql('Other');

    const issueAfterUpdate = await jira.findIssue(jiraIssue.id);
    chai
      .expect(issueAfterUpdate.fields.comment.comments[0].body)
      .to.not.contain('{issue}');
  });
});
