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

describe('TCS: Test manually classify text as decision knowledge', () => {
  before(async () => {
    await setUpJira();
  });
  it(// This is currently failing, see bugs: CONDEC-857 and CONDEC-858
  'should classify elements in specific macro tags as decision knowledge (R1)' /*
      - {issue} How to implement ...? {issue}; icon: (!)
      - {decision} Use ... to implement ...! {decision}; icon: (/)
      - {alternative} Use ... to implement ...! {alternative}; icon: (on)
      - {pro} Improves security. {pro}; icon: (+)
      - {con} Reduces usability. {con}; icon: (-) 
     */, async () => {
    const issue1 = await createJiraIssue(
      'Task',
      'Create a blog page for the Moo company'
    );
    await jira.addComment(
      issue1.id,
      '{issue}Which site generator should be used to make the blog?{issue}\n' +
        '{decision}Use Jekyll to make the blog!{decision}\n' +
        '{pro}Jekyll is free{pro}\n' +
        '{con}Jekyll has a learning curve{con}\n' +
        '{alternative}Use WordPress to make the blog!{alternative}\n'
    );
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
  it(// This is currently failing, see bugs: CONDEC-857 and CONDEC-858
  'should classify elements marked with specific Jira icons as decision knowledge (R1)', async () => {
    // Jira project exists and ConDec plugin is activated/enabled for the
    // project, Jira issue exists
    const issue2 = await createJiraIssue(
      'Task',
      'Decide on the domain name for the blog'
    );
    // Step 1: add a comment containing manually classified decision knowledge
    // with Jira emoji
    await jira.addComment(
      issue2.id,
      '(!) Which domain registrar should be used?\n' +
        '(/) Use openSRS for registering the domain name!\n' +
        '(+) OpenSRS has low fees\n' +
        '(on) Use GoDaddy for registering the domain name!\n' +
        '(-) GoDaddy has high fees'
    );
    // Step 2: examine the knowledge elements that are in the database. Make
    // sure all of the added elements exist
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
  it('should replace Jira emoji with macro tags in Jira issue comments (R2)', async () => {
    const issue = await createJiraIssue('Task', 'Enable website navigation');

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

  // This is currently failing because non-classified text in comments is
  // ignored and not added to the knowledge graph.
  it('should set knowledge type of parts of a sentence not annotated as decision knowledge to "other" with status "irrelevant" (R4)', async () => {
    const issue = await createJiraIssue('Task', 'Enhance user experience');
    await jira.addComment(
      issue.id,
      "I don't think we should use cookies to track our users.\n{issue}How can we enhance user experience without compromising privacy?{issue}"
    );
    const knowledgeElements = await getKnowledgeElements('', issue.key);
    // contain.something.like is an idiom for a list element containing an
    // Object with a matching subset
    chai.expect(knowledgeElements).to.contain.something.like({
      summary: "I don't think we should use cookies to track our users.",
      status: 'irrelevant',
      type: 'Other',
    });
  });
  it('should remove macro tags from a manually annotated Jira comment when it is marked as irrelevant in a view on the knowledge graph (R5)', async () => {
    const jiraIssue = await createJiraIssue('Task', 'Implement dark mode');

    const decisionKnowledgeElement = await createDecisionKnowledgeElement(
      'Should the default text be green?',
      'Issue',
      's',
      jiraIssue.id,
      'i'
    );
    await setSentenceIrrelevant(decisionKnowledgeElement.id);

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
