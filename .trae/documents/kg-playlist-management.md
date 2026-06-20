# 酷狗歌单管理功能实现计划

## 概述
为酷狗音乐实现完整的歌单管理功能，包括：收藏歌单、取消收藏/删除歌单、添加歌曲到歌单、从歌单移除歌曲。同时在 MusicAddModal 中添加酷狗歌单选项。

## 当前状态分析

### 已实现
- `kugouApi.ts` 中 `getUserPlaylists()` - 获取歌单列表
- `kugouApi.ts` 中 `addSongToPlaylist()` - 添加歌曲到歌单（已存在但未被 UI 调用）
- `kugouApi.ts` 中 `getPlaylistSongs()` - 获取歌单歌曲
- `KgPlaylist/index.tsx` - 酷狗歌单页面（自建/收藏两个 Tab）
- `MusicAddModal/List.tsx` - 已部分支持 kg 类型（有 `useKgSubscribedPlaylists` hook 和渲染逻辑）

### 缺失
1. **kugouApi.ts 缺少 3 个 API**：收藏歌单、取消收藏/删除歌单、从歌单删除歌曲
2. **MusicAddModal/MusicAddModal.tsx** - 未添加酷狗歌单按钮和 handleSelect 逻辑
3. **SonglistDetail** - 未支持酷狗歌单的收藏 toggle
4. **OnlineList** - 未支持酷狗歌单的歌曲移除
5. **store/user** - 缺少 kg 歌单状态管理

## 实施步骤

### 步骤 1：在 kugouApi.ts 中添加 3 个缺失的 API

**文件**: `src/utils/kugouApi.ts`

#### 1.1 添加 `subscribePlaylist` (收藏歌单)
- 接口：`POST /cloudlist.service/v5/add_list`
- 参数：`userid`, `token`, `name`, `type=1`, `list_create_userid`, `list_create_listid`, `list_create_gid`, `source=1`
- 签名方式：与 `getUserPlaylists` 一致（`signAndroidParams`）

#### 1.2 添加 `unsubscribePlaylist` (取消收藏/删除歌单)
- 接口：`POST /v2/delete_list`
- 参数：`listid`, `type=1`
- 注意：需要 AES+RSA 加密（参考 KuGouMusicApi 的 `playlist_del.js`，使用 `playlistAesEncrypt` 和 `rsaEncrypt2`）
- 请求头：`x-router: cloudlist.service.kugou.com`

#### 1.3 添加 `removeSongsFromPlaylist` (从歌单删除歌曲)
- 接口：`POST /v4/delete_songs`
- 参数：`listid`, `fileids`（逗号分隔）, `type=0`, `list_ver=0`
- 请求头：`x-router: cloudlist.service.kugou.com`

### 步骤 2：在 MusicAddModal 中添加酷狗歌单支持

**文件**: `src/components/MusicAddModal/MusicAddModal.tsx`

#### 2.1 扩展 playlistType 类型
- 将 `playlistType` 从 `'local' | 'wy' | 'tx'` 扩展为 `'local' | 'wy' | 'tx' | 'kg'`

#### 2.2 添加"酷狗歌单"Tab 按钮
- 在现有三个按钮（本地/网易/QQ）后添加第四个按钮"酷狗歌单"
- 参考 QQ 按钮的实现方式

#### 2.3 在 handleSelect 中添加 kg 分支
- 验证歌曲来源必须为 'kg'（酷狗歌单只能添加酷狗歌曲）
- 从 `listInfo.id` 中提取 listid（去掉 `kg__` 前缀）
- 从 `musicInfo` 中提取 hash、songname、album_id、mixsongid
- 调用 `addSongToPlaylist` API

### 步骤 3：在 SonglistDetail 中添加酷狗歌单收藏支持

**文件**: `src/screens/SonglistDetail/index.tsx`

#### 3.1 扩展 showSubscribeButton 条件
- 当前只对网易云显示收藏按钮：`info.source === 'wy' && !isWyCreator`
- 扩展为：`(info.source === 'wy' && !isWyCreator) || info.source === 'kg'`

#### 3.2 添加 kg 收藏/取消收藏逻辑
- 判断当前歌单是否已收藏（通过 `useKgSubscribedPlaylists` 或直接查询）
- 调用 `subscribePlaylist` 或 `unsubscribePlaylist` API
- 更新 store 中的 kg 歌单列表

### 步骤 4：在 OnlineList 中添加酷狗歌曲移除支持

**文件**: `src/components/OnlineList/index.tsx`

#### 4.1 扩展 handleRemoveMusic
- 在现有的 QQ 音乐移除逻辑后，添加 kg 分支
- 判断 `listId.startsWith('kg__')`
- 提取 listid，获取歌曲的 fileid
- 调用 `removeSongsFromPlaylist` API
- 成功后刷新歌单详情

#### 4.2 扩展 isCreator 判断
- 在 `SonglistDetail/MusicList.tsx` 中，对 kg 歌单判断是否为用户自建

### 步骤 5：Store 层添加酷狗歌单状态管理

**文件**: `src/store/user/state.ts`, `src/store/user/action.ts`

#### 5.1 添加 kg_subscribed_playlists 状态
- 类型：`KgPlaylistInfo[]`
- 字段：`id`, `listid`, `name`, `cover`, `songCount`, `listCreateUserid`, `listCreateListid`

#### 5.2 添加操作函数
- `setKgSubscribedPlaylists`
- `addKgSubscribedPlaylist`
- `removeKgSubscribedPlaylist`

#### 5.3 添加 hook
- `useKgSubscribedPlaylists`（List.tsx 中已有引用，需要实现）

## 关键文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/utils/kugouApi.ts` | 新增函数 | 3 个 API：subscribePlaylist, unsubscribePlaylist, removeSongsFromPlaylist |
| `src/components/MusicAddModal/MusicAddModal.tsx` | 修改 | 添加酷狗歌单 Tab 和 handleSelect 逻辑 |
| `src/screens/SonglistDetail/index.tsx` | 修改 | 添加 kg 歌单收藏按钮 |
| `src/screens/SonglistDetail/MusicList.tsx` | 修改 | 添加 kg isCreator 判断 |
| `src/components/OnlineList/index.tsx` | 修改 | 添加 kg 歌曲移除逻辑 |
| `src/store/user/state.ts` | 修改 | 添加 kg 歌单状态 |
| `src/store/user/action.ts` | 修改 | 添加 kg 歌单操作函数 |
| `src/store/user/hook.ts` | 修改 | 添加 useKgSubscribedPlaylists hook |
| `src/event/stateEvent.ts` | 修改 | 添加 kgSubscribedPlaylistsChanged 事件 |

## 假设和决策

1. **歌曲数据格式**：酷狗歌曲的 `hash` 字段对应 API 的 `fileid`，`songmid` 对应 `hash`
2. **歌单标识**：酷狗歌单 ID 使用 `kg__` 前缀（与 QQ 的 `tx__` 一致）
3. **收藏判断**：通过比较 `list_create_userid` 与当前用户 ID 判断是否为自建歌单
4. **删除歌单 API 的加密**：需要使用 `playlistAesEncrypt` + `rsaEncrypt2`，参考 KuGouMusicApi 实现

## 验证步骤

1. 在 MusicAddModal 中能看到"酷狗歌单"Tab
2. 能将酷狗歌曲添加到酷狗歌单
3. 在酷狗歌单详情页能移除歌曲
4. 在歌单详情页能收藏/取消收藏酷狗歌单
5. 在 KgPlaylist 页面能新建/删除歌单
