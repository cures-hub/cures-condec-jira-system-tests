const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  getKnowledgeElements,
  setSentenceIrrelevant,
  createDecisionKnowledgeElement,
  getSpecificKnowledgeElement,
  filterKnowledgeElements,
} = require('./helpers.js');

const { defaultIssueType } = require('../config.json');

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
   * System function: Manually classify text in the description or comments of a Jira issue as decision knowledge
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.4.1: Jira issue description or comment, part of Jira issue text (sentence) marked with tags or an icon
   * Test steps:
      1. Add a comment to the jira issue containing the macro tags: {issue}, {decision}, {alternative}, {pro}, {con} (see below for example)
   * Expected result on GUI: The comment is displayed with only text between macro tags are present. Each macro is shown with its corresponding icon and background color.
   * Expected exception: none
   * Postcondition system: The knowledge elements are stored in the ConDec database. Each has the knowledge element type given by its macro, and its text has been stripped of its macro tags.
   */
  it('should classify elements in specific macro tags as decision knowledge (R1)', async () => {
    /*
    The macro tags are:
      - {issue} How to implement ...? {issue}
      - {decision} Use ... to implement ...! {decision}
      - {alternative} Use ... to implement ...! {alternative}
      - {pro} Improves security. {pro}
      - {con} Reduces usability. {con}
     */

    const jiraIssue = await createJiraIssue(defaultIssueType, 'Create a blog page for the Moo company');
    await jira.addComment(
      jiraIssue.id,
      '{issue}Which site generator should be used to make the blog?{issue}\n' +
        '{decision}Use Jekyll to make the blog!{decision}\n' +
        '{pro}Jekyll is free{pro}\n' +
        '{con}Jekyll has a learning curve{con}\n' +
        '{alternative}Use WordPress to make the blog!{alternative}\n'
    );
    const knowledgeElements = await getKnowledgeElements('', jiraIssue.key);

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
      chai.expect(knowledgeElements).to.contain.something.like(partialElement);
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge should classify elements marked with specific Jira icons as decision knowledge (R1)
   *
   * System function: Manually classify text in the description or comments of a Jira issue as decision knowledge
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.4.1: Jira issue description or comment, part of Jira issue text (sentence) marked with tags or an icon
   * Test steps:
      1. Add a Jira issue comment with one knowledge element tagged for each available icon
   * The icons are:
        (!) - issu
        (/) - decision
        (on) - alternative
        (+) - pro
        (-) - con
   * Expected result on GUI: The manually classified decision knowledge is displayed with the graphical equivalents of each icon, and each has a corresponding background color.
   * Expected exception: none
   * Postcondition system: Each tagged decision knowledge element is stored as an element with the corresponding type in the ConDec database. The summary of each element is its text excluding the icon.
   */
  it('should classify elements marked with specific Jira icons as decision knowledge (R1)', async () => {
    /*
    The icons are:
    (!) - issue
    (/) - decision
    (on) - alternative
    (+) - pro
    (-) - con
     */

    const jiraIssue = await createJiraIssue(defaultIssueType, 'Decide on the domain name for the blog');
    await jira.addComment(
      jiraIssue.id,
      '(!) Which domain registrar should be used?\n' +
        '(/) Use openSRS for registering the domain name!\n' +
        '(+) OpenSRS has low fees\n' +
        '(on) Use GoDaddy for registering the domain name!\n' +
        '(-) GoDaddy has high fees\n'
    );
    const knowledgeElements = await getKnowledgeElements('', jiraIssue.key);
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
      chai.expect(knowledgeElements).to.contain.something.like(partialElement);
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge should replace Jira icons with macro tags in Jira issue comments (R2)
   *
   * System function: Manually classify text in the description or comments of a Jira issue as decision knowledge
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.4.1: Jira issue description or comment, part of Jira issue text (sentence) marked with tags or an icon
   * Test steps:
      1. Add a comment to the Jira issue containing decision knowledge marked by Jira icons
   * Expected result on GUI: The manually classified decision knowledge is displayed with the graphical equivalents of each icon, and each has a corresponding background color.
   * Expected exception: none
   * Postcondition system: The text of each decision knowledge element is stored in the comment wrapped in the corresponding macro tags
   *
   */
  it('should replace Jira icons with macro tags in Jira issue comments (R2)', async () => {
    const issue = await createJiraIssue(defaultIssueType, 'Enable website navigation');

    await jira.addComment(
      issue.id,
      '(!) Should we add a back button to the website?' +
        '(on) Add a back button that is visible on the same spot on every page'
    );

    const issueAfterCommenting = await jira.findIssue(issue.id);
    chai
      .expect(issueAfterCommenting.fields.comment.comments[0])
      .to.have.property(
        'body',
        '{issue} Should we add a back button to the website?{issue}{alternative} Add a back button that is visible on the same spot on every page{alternative}'
      );
  });

  /**
   * TCS: Test manually classify text as decision knowledge should set knowledge type of parts of a sentence not annotated as decision knowledge to "other" and property "relevant" to false (R4)   *
   *
   * System function: Manually classify text in the description or comments of a Jira issue as decision knowledge
   * Precondition system: Jira issue exists
   * Precondition GUI: WS1.4.1: Jira issue description or comment, part of Jira issue text (sentence) marked with tags or an icon
   * Test steps:
      1. Add a comment to the Jira issue containing some decision knowledge elements and some text not marked as decision knowledge
   * Expected result on GUI: The knowledge element is shown on the knowledge graph. The untagged part of the comment is not shown.
   * Expected exception: none
   * Postcondition system: The untagged text is stored with the property "relevant" set to false, and knowledge type "Other"
   */
  it('should set knowledge type of parts of a sentence not annotated as decision knowledge to "other" and property "relevant" to false (R4)', async () => {
    const issue = await createJiraIssue(defaultIssueType, 'Enhance user experience');
    await jira.addComment(
      issue.id,
      "I don't think we should use cookies to track our users.\n{issue}How can we enhance user experience without compromising privacy?{issue}"
    );
    const knowledgeElements = await filterKnowledgeElements({
      selectedElement: issue.key,
      isIrrelevantTextShown: true,
    });
    chai.expect(knowledgeElements).to.contain.something.like({
      relevant: false,
      summary: "I don't think we should use cookies to track our users.",
      type: 'Other',
    });
  });

  /**
   * TCS: Test manually classify text as decision knowledge should remove macro tags from a manually annotated Jira comment when it is marked as irrelevant in a view on the knowledge graph (R5)
   *
   * System function: Manually classify text in the description or comments of a Jira issue as decision knowledge
   * Precondition system: Jira issue exists and has a comment containing a decision knowledge element
   * Precondition GUI: WS1.4.1: Jira issue description or comment, part of Jira issue text (sentence) marked with tags or an icon
   * Test steps:
      1. Set the sentence as irrelevant on a view on the knowledge graph (=call the REST endpoint setSentenceIrrelevant)
   * Expected result on GUI: The comment no longer has highlighted text. The element is removed from the knowledge graph. A success message is shown.
   * Expected exception: None
   * Postcondition system: The comment no longer contains the macro tags but still contains the original text. The knowledge element from the comment has type "Other".
   */
  it('should remove macro tags from a manually annotated Jira comment when it is marked as irrelevant in a view on the knowledge graph (R5)', async () => {
    const jiraIssue = await createJiraIssue(defaultIssueType, 'Implement dark mode');
    const decisionKnowledgeElement = await createDecisionKnowledgeElement(
      'Should the default text be green?',
      'Issue',
      's',
      jiraIssue.id,
      'i'
    );
    
    chai.expect(parseInt(decisionKnowledgeElement.id)).to.be.greaterThan(0);
    await setSentenceIrrelevant(decisionKnowledgeElement.id);

    const decisionKnowledgeElementAfterUpdate = await getSpecificKnowledgeElement(decisionKnowledgeElement.id, 's');
    chai.expect(decisionKnowledgeElementAfterUpdate.type).to.eql('Other');

    const issueAfterUpdate = await jira.findIssue(jiraIssue.id);
    chai.expect(issueAfterUpdate.fields.comment.comments[0].body).to.not.contain('{issue}');
    chai.expect(issueAfterUpdate.fields.comment.comments[0].body).to.contain('Should the default text be green?');
  });
});
