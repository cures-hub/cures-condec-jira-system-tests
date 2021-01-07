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
    '(R1) Both macro tags and icons/emojis can be used to manually classify/annotate' +
      ' text as an decision knowledge element',
    /*
      - {issue} How to implement ...? {issue}; icon: (!)
      - {decision} Use ... to implement ...! {decision}; icon: (/)
      - {alternative} Use ... to implement ...! {alternative}; icon: (on)
      - {pro} Improves security. {pro}; icon: (+)
      - {con} Reduces usability. {con}; icon: (-) 
     */
    async () => {
      const issue = await createJiraIssue(
        'Task',
        'Create a blog page for the Moo company'
      );
      await jira.addComment(
        issue.id,
        '{issue}Which site generator should be used to make the blog?{issue}\n' +
          '{decision}Use Jekyll to make the blog!{decision}\n' +
          '{pro}Jekyll is free{pro}\n' +
          '{con}Jekyll has a learning curve{con}\n' +
          '{alternative}Use WordPress to make the blog!{alternative}'
      );
      const knowledgeElements = await getKnowledgeElements('', issue.key);
      chai.expect(knowledgeElements).to.have.lengthOf(6);
      chai.expect(knowledgeElements).to.contain.something.like({
        type: 'Issue',
        summary: 'Which site generator should be used to make the blog?',
      });
      chai.expect(knowledgeElements).to.contain.something.like({
        type: 'Decision',
        summary: 'Use Jekyll to make the blog!',
      });
      chai.expect(knowledgeElements).to.contain.something.like({
        type: 'Pro',
        summary: 'Jekyll is free',
      });
      chai.expect(knowledgeElements).to.contain.something.like({
        type: 'Con',
        summary: 'Jekyll has a learning curve',
      });
      chai.expect(knowledgeElements).to.contain.something.like({
        type: 'Alternative',
        summary: 'Use WordPress to make the blog!',
      });
    }
  );
});
