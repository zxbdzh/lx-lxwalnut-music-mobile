<p align="center"><a href="https://github.com/lyswhut/lx-music-mobile"><img width="200" src="https://github.com/lyswhut/lx-music-mobile/blob/master/doc/images/icon.png" alt="lx-music logo"></a></p>

<h1 align="center">LX-N Music 移动版-改</h1>

<p align="center">
  <a href="https://github.com/souvenp/lx-netease-music-mobile/releases"><img src="https://img.shields.io/github/release/souvenp/lx-netease-music-mobile" alt="Release version"></a>
  <a href="https://github.com/souvenp/lx-netease-music-mobile/actions/workflows/release.yml"><img src="https://github.com/souvenp/lx-netease-music-mobile/workflows/Build/badge.svg" alt="Build status"></a>
  <a href="https://github.com/facebook/react-native"><img src="https://img.shields.io/github/package-json/dependency-version/souvenp/lx-netease-music-mobile/react-native/master" alt="React native version"></a>
</p>

<p align="center">一个基于 React Native 开发的音乐软件</p>

这个库在 lx-music-mobile 和 ikun-music 基础上继续改造，个人自用，更新频率看个人更新频率。

- https://github.com/lyswhut/lx-music-mobile
- https://github.com/ikunshare/ikun-music-mobile
- https://github.com/souvenp/lx-netease-music-mobile

> **注意**: 涉及同步、备份未充分测试，请自行备份重要文件

---

## 26.06.1

###  新增

- WebDAV 远程播放，支持匹配标签歌词，适配多文件夹情况下的歌单选择
- 左侧菜单排序
- 我的列表音乐列表排序（Pad 竖屏可见）
- 横向滚动界面排序
- 显示问候语开关
- 日志复制功能
- WebDAV 运行日志
- 隐藏小白条
- 上滑播放栏显示播放列表开关（搭配隐藏小白条用）

###  优化

- 底部播放栏背景样式同步设置修改
- 日志界面上下滑动卡顿 BUG
- 部分数据备份问题

###  修复

- 我的歌单中音乐列表的背景样式 bug
- 我中音乐列表的背景样式不同步设置修改的 BUG
- 每日推荐中推荐歌单背景样式不同步设置修改的 BUG
