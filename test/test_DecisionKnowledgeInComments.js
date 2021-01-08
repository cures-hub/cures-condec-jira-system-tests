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

describe('TCS: CONDEC-123', () => {
  before(async () => {
    await setUpJira();
  });
  it(
    // This is currently failing, see bugs: CONDEC-857 and CONDEC-858
    '(R1) (part 1) Macro tags can be used to manually classify/annotate' +
      ' text as an decision knowledge element',
    /*
      - {issue} How to implement ...? {issue}; icon: (!)
      - {decision} Use ... to implement ...! {decision}; icon: (/)
      - {alternative} Use ... to implement ...! {alternative}; icon: (on)
      - {pro} Improves security. {pro}; icon: (+)
      - {con} Reduces usability. {con}; icon: (-) 
     */
    async () => {
      // Case one: using macro tags
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
        chai
          .expect(knowledgeElements1)
          .to.contain.something.like(partialElement);
      });
    }
  );
  it(
    // This is currently failing, see bugs: CONDEC-857 and CONDEC-858
    '(R1) (part 2) Icons/emojis can be used to manually classify/annotate' +
      ' text as an decision knowledge element',
    async () => {
      // Case two
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
        chai
          .expect(knowledgeElements2)
          .to.contain.something.like(partialElement);
      });
    }
  );
  it('(R2) If a sentence is manually classified with an icon/emoji, the icon/emoji is automatically replaced with the macro tags, e.g. "(!) How to...?" is replaced with "{issue} How to...? {issue}".', async () => {
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
  xit(
    // This will be tested with the tests for CONDEC-291
    '(R3) Links are automatically established between the classified decision knowledge element and the parent Jira issue that the comment/description belongs to or to another decision knowledge element (CONDEC-291). '
  );

  // This is currently failing because non-classified text in comments is
  // ignored and not added to the knowledge graph.
  it('(R4) If a part of text/sentence is not classified as a decision knowledge element, its knowledge type is "other" and it is "irrelevant".', async () => {
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
  it('(R5) If a decision knowledge element in a view on the knowledge graph is set irrelevant, its knowledge type is changed to "other" and the macro tags are removed from the description/the comment (CONDEC-169).', async () => {
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
  xit(
    ' (R6) If the automatic text classifier is activated, it is automatically retrained when a validated decision knowledge element is created or changed (CONDEC-175).'
  );
});
