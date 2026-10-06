# Ruojun Qin · Research Space

Website: https://qinruojun.github.io/  
Blog: https://qinruojun.github.io/blog/  
Writing editor: https://qinruojun.github.io/write/

A public research space for technical insights, paper readings, and personal perspectives on embodied AI and robot learning.

## Write and publish

1. Open the Blog and select **Write a Post**. For a paper discussion, select **Share a Paper** on Research Paper Sharing.
2. Fill in the title, summary, tags, and Markdown content. The editor keeps one draft per post type in the current browser.
3. Select **Open GitHub Editor**. Short posts are prefilled. For a long post, copy the complete Markdown and paste it into the GitHub editor, or download the `.md` file.
4. Review the **Preview** tab, then **Commit changes** to `main`. GitHub Pages builds and publishes the update.

Only the owner and authorized collaborators can commit directly. The writing page itself does not publish content or require a GitHub token. Browser drafts are local to that browser; download Markdown for a portable backup.

Existing articles have an **Edit this Post** link. Images can be uploaded to `images/` in the repository and referenced as `![Description](/images/example.png)`. Set a cover path or URL for the article card. Enable LaTeX math when needed.

You can also write in Obsidian or another Markdown editor, then paste the body into the writing page. Alternatively copy `templates/post.md` into `_blog/your-post.md` or `templates/paper.md` into `_papers/your-paper.md`, fill in metadata, and set `published: true`.

The filename determines the default article URL. Choose a unique URL name for each new post. A file with `published: false` is excluded from the website, but its source is still public if committed to this public repository.

## Customize

- `_config.yml`: name, bio, interests, site settings.
- `_data/navigation.yml`: navigation labels and links.
- `index.html`: home sections for News, Experience, Publications, Projects, Awards, Talks, and CV.
- `_pages/`: Blog, Research Paper Sharing, About, and the writing page.
- `assets/css/notes.css`: reference-derived light theme and authoring styles.

Sections without supplied information are marked as not yet added. Replace these with verified personal information when ready.

## Hosting and theme

The repository is Public and uses GitHub Pages, Jekyll, and the AcademicPages-derived WowPage theme. The theme is pinned to `oplisty/oplisty.github.io@77a3d7c5969206e07ffb76c69b5b03e05d84ed39`. Reference: https://oplisty.github.io/blog/

The layout and CSS reuse the reference template; its MIT license is retained in `LICENSE-THEME`. Other people's articles and profile content are not included. Articles do not automatically inherit the theme's license.

Pages publishes from `main` and `/(root)`. No separate server or ChatGPT subscription is required to keep the published site available.

For local development with Ruby and Bundler:

```bash
bundle install
bundle exec jekyll serve
```
