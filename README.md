# Ruojun Qin · 技术笔记

网站：https://qinruojun.github.io/

个人技术博客，分享具身智能、机器人学习相关的技术 insight、论文解读与个人思考。

## 与参考网站的关系

参考：https://oplisty.github.io/blog/

本网站同样使用 **GitHub Pages + Jekyll + AcademicPages 衍生模板 WowPage**。通过 `jekyll-remote-theme` 加载参考仓库中固定版本的主题，仅复用模板代码与基础样式，不包含对方的文章、个人信息或照片。原始模板许可见 `LICENSE-THEME`。

主题固定在提交 `77a3d7c5969206e07ffb76c69b5b03e05d84ed39`，不会因为对方更新主分支而自动改变。本站覆盖导航、侧栏、文章列表、论文分享及浅色样式，没有 Services。

## 写博客

复制 `templates/post.md` 到 `_blog/文章短名.md`，编辑标题、日期、摘要、标签和正文，最后设置 `published: true` 并提交。

例如 `_blog/action-chunking.md` 的地址为 `/blog/action-chunking/`。文件名决定默认网址，模板中的 `slug` 可移除；需要固定自定义网址时使用 `permalink: /blog/自定义路径/`。

元数据是标准 YAML，正文是 Markdown，由 Jekyll/kramdown 处理，支持代码高亮、表格和图片。需要公式时设置 `math: true`。

## 分享论文

复制 `templates/paper.md` 到 `_papers/论文短名.md`。填写真实 `paper_title`、`paper_url`，可选 `code_url`，并写下自己的观点。

模板包含问题与方法、论文证据、我的 insight、不同意见与疑问、可继续验证的问题。写完后设置 `published: true`。

`published: false` 的内容不进入网站，但 **Public 仓库内的源文件仍然公开可读**。不要将需要保密的研究内容提交到本仓库。

## 改个人资料

- `_config.yml`：姓名、简介、研究兴趣、GitHub 和网站地址。
- `_data/navigation.yml`：导航。
- `_pages/about.md`：关于页面。
- `assets/css/notes.css`：本站的浅色配色、衬线标题与响应式布局。

没有添加未经确认的学校、履历、邮箱、论文成果或照片。第一篇是开篇介绍，论文分享区从空白开始。

## GitHub Pages

仓库可见性为 Public。`Settings → Pages` 使用 `Deploy from a branch`，发布源选择 `main` 和 `/(root)`，由 GitHub 的 Jekyll 构建服务自动生成网站。无需自备服务器，也不依赖 ChatGPT 订阅。

## 本地运行

安装 Ruby 与 Bundler 后：

```bash
bundle install
bundle exec jekyll serve
```

打开终端中显示的本地地址（通常为 `http://127.0.0.1:4000`）。首次构建需要联网下载主题和 Ruby 依赖。

## 目录

```text
_blog/                 技术博客
_papers/               论文分享
_pages/                博客列表、论文列表、关于
_layouts/              本站覆盖的页面布局
_includes/             本站覆盖的可复用片段
_data/navigation.yml   导航
assets/                浅色样式、搜索脚本、图标
templates/             写作模板，不进入生成的网站
_config.yml            Jekyll 与个人信息配置
```

参考主题源码的 MIT 许可保留在 `LICENSE-THEME`；本站文章并未因此自动采用 MIT 许可。
