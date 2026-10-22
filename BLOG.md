# Writing blog posts

Posts are Markdown files. GitHub Pages builds them with Jekyll whenever you push to `master`, so there is nothing to compile or generate.

## Publish a post

1. Copy `_drafts/post-template.md` to `_posts/YYYY-MM-DD-your-slug.md`.
   The date in the filename is the publish date; the slug becomes the URL (`/blog/your-slug/`).
2. Edit the front matter (`title`, `description`, `tags`) and write the post below it.
3. Commit and push. The site updates in a minute or two.

You can also create the file directly on github.com ("Add file" → "Create new file").

Posts dated in the future are not published until that date.

## Writing

- Standard Markdown plus GitHub-style fenced code blocks (` ```python `), tables and task lists.
- Images: put them in `images/` and reference `![alt](/images/name.png)`.
- Code containing `{{ ... }}` or `{% ... %}` must be wrapped in `{% raw %} ... {% endraw %}`, otherwise Jekyll treats it as a template.
- `description` is shown on the blog index and in link previews. If omitted, the first paragraph is used.

## Tags, dates and RSS

- **Tags:** list them in the front matter, one YAML list item each: `tags: [python, protein design]`. They appear on the post, link to `/blog/?tag=python`, and show up (with counts) in the blog's filter panel. Tag names are slugified for URLs (`protein design` becomes `protein-design`).
- **Date navigation:** the blog index has a year/month archive with counts. Clicking narrows the list, and tag and date filters combine (`/blog/?tag=python&date=2026-03`). Every post links to its month, and has newer/older links at the bottom.
- **RSS:** the Atom feed is `/blog/feed.xml` (latest 20 posts, full content), advertised to feed readers from every blog page. Image and link paths starting with `/` are made absolute in the feed automatically.

Filtering runs in the browser (`assets/js/blog.js`), because GitHub Pages cannot generate per-tag pages. Without JavaScript the index just lists every post.

## Drafts

Anything in `_drafts/` is never published. To preview drafts locally, use `bundle exec jekyll serve --drafts`.

## Preview locally (optional)

```bash
bundle install          # first time only; needs Ruby 3+
bundle exec jekyll serve
```

Then open http://localhost:4000.
