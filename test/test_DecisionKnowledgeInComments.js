const chai = require('chai');

const {
  setUpJira,
  createJiraIssue,
  jira,
  getKnowledgeElements,
} = require('./helpers.js');

chai.use(require('chai-like'));
chai.use(require('chai-things'));

describe('TCS: CONDEC-123', () => {
  before(async () => {
    await setUpJira();
  });
  it(
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
});
