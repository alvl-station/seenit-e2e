// Page object for the site's STORIES (/stories, revised 2026-10-07; seenit-frontend src/site/stories.js): a list
// and a panel. A row opens its story in the panel and the address follows (stories#<slug>); each story names its
// sources, credits its photo and keeps its trailer a button until it is pressed.
const { SitePage } = require('./SitePage');

class StoriesPage extends SitePage {
  constructor(page) {
    super(page);
    this.rows = page.locator('#stList a.k3-row');
    this.stories = page.locator('article.k3-story');
    this.openStory = page.locator('article.k3-story.is-open');
    this.photoCredits = page.locator('article.k3-story figcaption');
    this.trailerButtons = page.locator('article.k3-story.is-open .k3-vid[data-yt]');
    this.trailerFrames = page.locator('iframe.k3-frame');
  }

  /** The sources one story names. */
  sourcesOf(story) { return story.locator('.k3-src li'); }
  /** The address of the first story that has a trailer. */
  async storyWithTrailer() {
    return this.page.locator('article.k3-story:has(.k3-vid[data-yt])').first().getAttribute('id');
  }
  /** The story a row opens. */
  async rowSlug(row) { return row.getAttribute('data-open'); }
  /** The slug of the story open in the panel. */
  async openSlug() { return this.openStory.getAttribute('id'); }
  /** The row marked as the one open. */
  selectedRow() { return this.page.locator('#stList a.k3-row.sel'); }
}

module.exports = { StoriesPage };
