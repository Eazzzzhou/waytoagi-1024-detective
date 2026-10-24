# 团队协作

## 第一次加入

接受仓库邀请后，克隆项目：

```sh
git clone https://github.com/Eazzzzhou/waytoagi-1024-detective.git
cd waytoagi-1024-detective
```

先阅读 README 中的当前策划、核查规范和任务派单，再认领当轮工作。框架和实际运行命令由首轮工程落地后补充，不要各自创建互不兼容的应用。

## 一项任务，一个分支

从最新 `main` 开始，按职责创建分支，例如 `feat/retrieval`、`feat/verification`、`feat/case-ui`、`docs/evidence-standard`。

```sh
git switch main
git pull --ff-only
git switch -c feat/your-task
```

只提交本任务相关文件。完成一个可核验的小步骤后提交并推送：

```sh
git add <本次修改的文件>
git commit -m "Describe the completed change"
git push -u origin HEAD
```

在 GitHub 发起 Pull Request，说明：解决了什么、怎样验证、有什么缺口、是否改变共用字段或规则。由另一位成员检查后合入 `main`；合并后其他成员再同步。

如果同时运行多个编码 Agent，每个 Agent 使用单独分支和独立工作目录，或按顺序交接同一目录。共同字段和核心规则改动先在对应 Issue/PR 说明，避免多人同时改出不同含义。

## 任务与核验

使用 GitHub Issues 记录任务：负责人、目标行为、完成标准、阻塞关系、结果链接。核查类工作可交标注样本与错误记录，页面和核心用同一案例联调。

每次交接写明实际完成的行为、重现方式、通过/失败案例、已知限制、字段或规则变化。开发样例明确标注；真实用户记录先脱敏。密钥通过各自本地环境变量配置，不在 Issue、PR 或提交中粘贴。

本仓库目前没有配置强制分支保护或自动化检查。团队先按以上 PR 流程协作，实际技术栈落地后再添加有意义的检查。
