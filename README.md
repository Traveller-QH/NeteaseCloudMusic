<div align="center">
<img alt="logo" height="100" width="100" src="static/favicon.ico" />
<h2> NetEaseCloudMusic </h2>
<p> 一个基于 UniApp 的仿网易云音乐移动应用 </p>

|[GitHub](https://github.com/Traveller-QH/NeteaseCloudMusic) | [API 文档](https://binaryify.github.io/NeteaseCloudMusicApi/#/) |

<br />

[![Stars](https://img.shields.io/github/stars/Traveller-QH/NetEaseCloudMusic?style=flat)](https://github.com/Traveller-QH/NetEaseCloudMusic/stargazers)
[![License](https://img.shields.io/github/license/Traveller-QH/NetEaseCloudMusic)](https://github.com/Traveller-QH/NetEaseCloudMusic/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/Traveller-QH/NetEaseCloudMusic)](https://github.com/Traveller-QH/NetEaseCloudMusic/issues)

</div>

## 说明

> [!IMPORTANT]
> 
> ### 重要提示
> 
> - 本项目是学习性质的个人项目，仅供学习交流使用
> - 请遵守相关法律法规，不要用于商业及非法用途
> - 项目功能基于网易云音乐第三方 API 实现
> - 感谢您的理解与支持

- 本项目采用 [Vue.js](https://cn.vuejs.org/) + [UniApp](https://uniapp.dcloud.net.cn/) 开发
- Node.js 版本要求：>= 14，包管理器：npm 或 yarn
- 支持多端编译：微信小程序、H5、App 等
- 项目处于开发阶段，功能正在不断完善中

- 欢迎各位大佬 `Star` 😍

## 🧑‍💻 开发

### 快速开始

1. 安装依赖：`npm install` 或 `yarn install`
2. 启动开发：
   - `npm run dev:mp-weixin`  # 微信小程序
   - `npm run dev:h5`         # H5
   - `npm run dev:app`        # App
3. 构建：
   - `npm run build:mp-weixin`
   - `npm run build:h5`
   - `npm run build:app`

### 环境要求

- Node.js 14+
- HBuilderX 或 CLI 工具
- 微信开发者工具（如需编译小程序）

## 🎉 功能

### ✅ 已实现功能

- ✨ **发现页**：推荐歌单、新歌首发、排行榜、电台
- 🔍 **搜索页**：智能搜索、搜索历史、热门搜索
- 👤 **个人中心**：用户信息、我的音乐、最近播放、本地音乐
- 🎵 **音乐播放器**：播放控制、进度条、播放模式、歌词显示
- 📋 **歌单详情**：歌单信息、歌曲列表、评论互动
- 💿 **专辑详情**：专辑信息、歌曲列表、歌手信息
- 💬 **专辑评论系统**：详细评论功能
- 📹 **视频播放**：音乐视频播放、全屏模式
- 💬 **社区动态**：动态广场、关注动态、热门话题

### 🔄 待实现功能

- 🎤 **歌手详情页**：歌手信息、作品展示
- 👥 **用户详情页**：用户主页、动态、收藏
- ⚙️ **更多音效设置**：音效调节选项

## 🖼️ 界面展示

> 开发中，界面仅供参考

### 发现页面
- 推荐歌单展示
- 新歌首发区域
- 排行榜单
- 音乐电台

### 搜索页面
- 智能搜索框
- 搜索历史记录
- 热门搜索关键词
- 分类搜索结果

### 播放器页面
- 音乐封面展示
- 播放控制按钮
- 进度条控制
- 歌词同步显示

## 📦️ 获取

### 开发环境部署

1. 克隆仓库
```bash
git clone https://github.com/Traveller-QH/NetEaseCloudMusic.git
cd NetEaseCloudMusic
```

2. 安装依赖
```bash
npm install
```

3. 启动开发
```bash
# 微信小程序
npm run dev:mp-weixin

# H5
npm run dev:h5

# App
npm run dev:app
```

### 生产环境构建

```bash
# 微信小程序
npm run build:mp-weixin

# H5
npm run build:h5

# App
npm run build:app
```

## 技术架构

```
NetEaseCloudMusic/
├── pages/                 # 页面文件
│   ├── discovery/         # 发现页
│   ├── search/           # 搜索相关页面
│   ├── my/               # 个人中心
│   ├── player/           # 播放器
│   ├── playlist/         # 歌单详情
│   ├── album/            # 专辑详情
│   ├── video/            # 视频播放
│   ├── community/        # 社区
│   └── albumComments/    # 专辑评论（待开发）
├── components/           # 公共组件
├── static/              # 静态资源
├── utils/               # 工具函数
├── uni_modules/         # 第三方模块
└── 配置文件
```

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目：

- **[NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)** - 本项目使用的网易云音乐 API 服务

## 📢 免责声明

本项目部分功能使用了网易云音乐的第三方 API 服务，**仅供个人学习研究使用，禁止用于商业及非法用途**

同时，本项目开发者承诺 **严格遵守相关法律法规和网易云音乐 API 使用协议，不会利用本项目进行任何违法活动。** 如因使用本项目而引起的任何纠纷或责任，均由使用者自行承担。**本项目开发者不承担任何因使用本项目而导致的任何直接或间接责任，并保留追究使用者违法行为的权利**

请使用者在使用本项目时遵守相关法律法规，**不要将本项目用于任何商业及非法用途。如有违反，一切后果由使用者自负。** 同时，使用者应该自行承担因使用本项目而带来的风险和责任。本项目开发者不对本项目所提供的服务和内容做出任何保证

感谢您的理解

## 📜 开源许可

- **本项目仅供个人学习研究使用，禁止用于商业及非法用途**
- 本项目基于 [MIT License](https://opensource.org/licenses/MIT) 许可进行开源
  1. **修改和分发：** 任何对本项目的修改和分发都必须基于 MIT License 进行
  2. **注明原作者：** 在任何修改、派生作品或其他分发中，必须在适当的位置明确注明原作者及其贡献
  3. **免责声明：** 本项目不提供任何明示或暗示的担保
  4. **社区参与：** 欢迎社区的参与和贡献，我们鼓励开发者一同改进和维护本项目

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Traveller-QH/NetEaseCloudMusic&type=Date)](https://star-history.com/#Traveller-QH/NetEaseCloudMusic&Date)
