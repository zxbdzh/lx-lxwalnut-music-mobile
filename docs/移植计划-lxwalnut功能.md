# 完整移植计划:lxwalnut 改版功能 → 当前网易版项目

## Context(背景)

- **目标项目(被移植入功能)**:`lx-netease-music-mobile`,包名 `com.lxnetease.music.mobile`,v1.8.82。当前是「网易云方向的精简版」。
- **源项目(功能来源)**:`D:\Project\Git_project\lx-lxwalnut-music-mobile`,包名 `com.lxwalnut.music.mobile`,v26.06.14。在当前项目基础上叠加了「多音源 + 听歌识曲 + 云盘 + 新UI」。
- 两项目同源(lx-music-mobile 衍生),目录结构 ~99% 一致 → 大量功能可「纯新增文件」拷入,但有约 20 个**已有文件需侵入式修改**,以及 **1 处原生 Java 改动必须重新编译 APK**。
- 经文件级 diff:源比目标多 **81 个文件**(793 vs 712)。本计划目标是把改版的全部新功能补齐进当前项目。

### 待移植功能总览

| 功能 | 性质 | 难度 | 是否需重编译 |
|---|---|---|---|
| QQ音乐(tx)登录/歌单/MV/每日推荐 | JS + 1处原生(sha1) | ★★★★ | **是** |
| 酷狗(kg)登录/歌单/MV/每日推荐/高潮 | 纯JS(+新依赖) | ★★★ | 否 |
| B站(bilibili)音源 | 纯JS | ★ | 否 |
| 听歌识曲(酷狗指纹API) | 原生 Java 1440行 | ★★★★ | **是** |
| OneDrive 云盘 | 纯JS | ★★★ | 否 |
| WebDAV 在线音乐浏览/播放 | 纯JS | ★★★ | 否 |
| 播放详情新UI(+滑动切歌) | 侵入式改写多文件 | ★★★★ | 否 |
| 播放历史 | JS(+类型/数据层) | ★★ | 否 |
| 相似歌曲/歌手、图片预览 | JS(多源耦合) | ★★★ | 否 |
| 各类设置开关 | JS | ★★ | 否 |

### 新增依赖(package.json)
运行时:`crypto-js@^4.2.0`、`node-forge@^1.4.0`(仅 QQ/酷狗加解密用,纯JS 无原生链接)。
开发时:`@types/crypto-js`、`@types/node-forge`。
其余依赖(axios / react-native-webview / webdav / quick-md5 等)两边均已具备。

### 关键全局约束
- **包名替换**:任何原生 Java 文件移入时,`com.lxwalnut.music.mobile` → `com.lxnetease.music.mobile`(`package` 声明、所有 `import`、目录路径)。
- **勿带入无关改动**:源 `MainApplication` 含 Flipper/Bundle 改动、源 `musicSdk/index.js` 含 bilibili 注册等——按需精确合并,不要整文件覆盖。
- **共享 SDK 文件用「逐字段合并」而非整文件覆盖**(目标可能有自身改动)。

---

## 阶段 0:地基(阻塞一切,最先做)

> 这一步不完成,后续 QQ 签名失败、TS 编译报错。

1. **装依赖**:`crypto-js`、`node-forge`、`@types/crypto-js`、`@types/node-forge`。
2. **原生 sha1**(QQ 签名 `zzcSign` 的根依赖):
   - `android/.../crypto/CryptoModule.java` 增加 `@ReactMethod public void sha1(String text, Promise promise)`(参照源同名文件第 142 行)。
   - `src/utils/nativeModules/crypto.ts` 增加 `hashSHA1` 导出(参照源第 110-117 行)。
   - **改 Java = 必须重新 build APK**。
3. **拷贝日志工具**:`src/utils/txLog.ts`(源有目标无,tx 多文件依赖)。一并核对 `searchLog.ts`、`playerLog.ts` 是否被本次模块引用,缺则补。

**验证**:`npx tsc --noEmit` 不因 crypto 类型报错;重编译后 `hashSHA1('test')` 返回正确 sha1。

---

## 阶段 1:音源 SDK 层(纯新增为主)

### 1a. 加解密/工具(先做,被功能模块依赖)
纯新增:
- `src/utils/musicSdk/tx/utils/crypto.js`(24行,依赖原生 hashSHA1)、`tx/utils/index.js`(13行)。
- `src/utils/musicSdk/kg/utils/crypto.ts`(455行,用 crypto-js + node-forge)、`kg/utils/api.ts`(1282行,导出 13 个登录/歌单函数)。

**单测**:`zzcSign`(tx)、`generateSidEdt`/`cryptoAesEncrypt`(kg)能产出非空签名。

### 1b. 功能模块(纯新增)
- **tx**:`album.js`(455)、`artist.js`(897)、`dailyRec.js`(650)、`mv.js`(87)、`mv.d.ts`、`user.ts`(1292)。
- **kg**:`artist.js`(107)、`dailyRec.js`(403)、`mv.js`(363)、`user.js`(165)、`climax.ts`(124)。
- **bilibili**(整目录新增):`bilibili/index.js`(446)、`bilibili/musicSearch.js`(405)。

### 1c. 共享 SDK 文件(侵入式,逐字段合并)
- `tx/musicInfo.js`:加 `id:String(item.id)`、`vid: item.mv?.vid`、`size_new?.[]` 空安全。**必需**(artist/album/mv 依赖)。
- `tx/leaderboard.js`:加 `id/artists/vid` 字段。
- `tx/songList.js`(diff 295行,歌单功能需要)、`tx/musicSearch.js`(diff 502行,搜索增强,可后置)。
- `kg/musicInfo.js`:加 `songId/mixSongId/meta/img` 并过滤无效项。**必需**。
- `kg/quality_detail.js`:加 `songId/mixSongId/meta`。
- `kg/album.js`:`export default` 改具名 + 新增 `getAlbum()`。**必需**(AlbumDetail 调用)。
- `kg/songList.js`(72)、`kg/musicSearch.js`(182)。

### 1d. 音源注册(侵入式)
- `tx/index.js`:注册 `album/artist/user/dailyRec`,`getPic` 改 async。
- `kg/index.js`:注册 `artist/album/dailyRec/user`。
- `src/utils/musicSdk/index.js`:加 `import bilibili from './bilibili'` + `sources` 数组项 `{ name: '哔哩哔哩', id: 'bilibili' }` + 对象注册。
- 核对 `api-source-info.ts` / `options.js` / 音质配置是否需为 bilibili 加条目。

**验证**:三源在搜索/歌单/每日推荐页能返回结果;QQ 登录后能取到个人歌单。

---

## 阶段 2:配置 / 类型 / 国际化(侵入式,小但必须,前置于所有 UI)

> 不做这步,设置 UI 和新UI 全部 TS 编译报错。

1. **`src/config/defaultSetting.ts`** 新增 key(默认值):
   ```
   'common.tx_cookie': ''           'common.kg_cookie': ''
   'common.wy_serpapi_key': ''      'common.hideNavigationBar': false
   'common.isShowStartupGreeting': true
   'common.sectionExpandedStatus': {…}   'common.isEnableWebDAVLog': false
   'player.isEnableSlideSwitchSong': false
   'player.isSwipeToShowPlaylist': true
   'playDetail.style.newUI': true   'playDetail.style.coverSize': 100
   'playDetail.style.miniLyricAlign': 'center'
   'list.isNewListUI': true         'list.isShowMyListSubMenu': false
   'theme.sidebarDynamicBg': false  'theme.mylistDynamicBg': false
   'theme.sectionOpacity': 50       'theme.subContainerOpacity': 50
   'webdav.downloadPath': …         'nav_onedrive': true   'nav_webdav': true
   'nav_play_history': true(或纳入 navOrder)
   ```
2. **`src/types/app_setting.d.ts`**:与上一一对应加类型声明。
3. **`src/types/app.d.ts`**(global.app_event):加 `showTxWebLogin`、`showKgWebLogin`、`tx-cookie-set`、`kg-cookie-set`、`showVideoPlayer`(若缺)等事件。
4. **`src/lang/{zh-cn,zh-tw,en-us}.json`**(注意目标比源多 en-us,三个都要补):补 `setting_basic_tx_cookie(_placeholder)`、`_kg_cookie`、`setting_basic_play_detail_new_ui`、`setting_basic_slide_switch_song(_tip)`、`play_detail_setting_{new_ui,cover_size,mini_lrc_align*}`、`setting_other_hide_navigation_bar(_tip)`、`nav_play_history`、`nav_onedrive`、`nav_webdav` 等(源 zh-cn 675-678 行有现成 cookie 文案可参照)。
5. `store/setting/{state,action,hook}.ts` **无需改**(泛型读写,不硬编码 key)。

**验证**:`npx tsc --noEmit` 通过;设置项读写持久化正常。

---

## 阶段 3:登录 UI(依赖阶段 1 的 kg/utils/api、tx)

纯新增组件:
- `src/components/QQWebLoginModal.tsx`(268)、`QQWebLoginManager.tsx`(27)。
- `src/components/KgWebLoginModal.tsx`(472)、`KgWebLoginManager.tsx`(26)、`KgVerifyModal.tsx`(212)。
- 设置项:`Setting/settings/Basic/TxCookie.tsx`(50)、`KgCookie.tsx`(49)、`WebLoginBtn.tsx`(35)、`SerpApiKey.tsx`(21)。

侵入式挂载点:
- `src/screens/Home/index.tsx`:在 `<WebLoginManager />` 旁加 `<QQWebLoginManager />`、`<KgWebLoginManager />`。
- `Setting/settings/Basic/index.tsx`:**重构为多 Section**(基础/主题/平台),新增 `sectionId` 配合折叠;平台组挂 `WyCookie/TxCookie/KgCookie/SerpApiKey/WebLoginBtn`。

> 目标已有 `WebLoginManager/WebLoginModal/WyCookie`(网易登录),证明 `global.app_event` emit/on + Modal 模式可用,QQ/Kg 同模式扩展。

**验证**:设置页能看到 QQ/酷狗 Cookie 项和「网页登录」按钮;点登录弹 WebView,登录成功写入对应 cookie 设置项。

---

## 阶段 4:云盘(纯JS,与音源独立,可并行)

### 4a. OneDrive
纯新增:`src/core/oneDrive/{auth.ts(245),drive.ts(204),music.ts(62),utils.ts(7)}`、`src/screens/Home/Views/OneDrive/index.tsx`(799)、`src/types/onedrive.d.ts`(83)。
- 无 npm 依赖(纯 fetch 直连 Graph)。设备码流 + 授权码 PKCE,refresh token 自动续期,token 存 `@/plugins/storage`。
- **用户需自备 Azure Client ID**(UI 内含申请指引)。

### 4b. WebDAV 在线浏览
纯新增:`src/core/webdavMusic/{drive.ts(274),logger.ts(25)}`、`src/screens/Home/Views/WebDAV/{index.tsx(1074),WebDAVListAction.ts(478),WebDAVListMenu.tsx(89),components/WebDAVDownloadPath.tsx(90)}`、`src/types/webdav.d.ts`(36)。
- `webdav` 包已装。配置存 `@webdav_music_config`。
- 侵入式:`src/utils/webdav.ts`(logger 改用 webdavMusic/logger,可选)、`src/utils/fs.ts`(下载路径)。

### 4c. 共同挂载点(侵入式)
- `src/screens/Home/Vertical/Main.tsx` + `Horizontal/Main.tsx`:加 `OneDrivePage`/`WebDAVPage` 组件 import + `navActiveId` 视图切换 + 路由表项。
- `DrawerNav.tsx`:nav 菜单项(由 defaultSetting 的 `nav_onedrive/nav_webdav` 驱动)。

**验证**:侧边栏出现 OneDrive/WebDAV 入口;填 Client ID/WebDAV 地址后能列目录、点歌能播放。

---

## 阶段 5:听歌识曲(原生,必须重编译)

纯新增 JS:`src/core/musicRecognition.ts`(153)、`src/utils/nativeModules/musicRecognition.ts`(91)。
原生新增(放入 `com/lxnetease/music/mobile/recognition/`,改包名):
- `recognition/MusicRecognitionModule.java`(1440)、`MusicRecognitionPackage.java`(22)。
- `android/app/src/main/res/drawable/ic_music_recognition.xml`(18,复制即可)。

侵入式原生改动:
- **MainApplication**(java/kt):加 `import …recognition.MusicRecognitionPackage;` + `getPackages()` 里 `packages.add(new MusicRecognitionPackage());`。**只加这两行**,勿带 Flipper/Bundle 改动。
- **AndroidManifest.xml**:加权限 `RECORD_AUDIO`、`FOREGROUND_SERVICE`、`FOREGROUND_SERVICE_MICROPHONE`(`SYSTEM_ALERT_WINDOW` 已存在)。

侵入式 JS:`src/screens/Home/Vertical/DrawerNav.tsx`:加识曲按钮(参照源 21/282/336 行)。

> 识曲走酷狗指纹 API,凭据**硬编码**在 Module 里(salt/dfid/token),**用户无需申请 Key**,但 token 有失效风险。8000Hz/单声道/16bit/10秒,AudioRecord 采 PCM。

**验证**:重编译后 `isAvailable()` 为 true;点识曲录音 10 秒能返回歌曲并跳转播放。

---

## 阶段 6:播放详情新UI + 滑动切歌(侵入式最重)

> 新UI 用 `useSettingValue('playDetail.style.newUI')` 在多层 `isNewUI ? 新 : 旧` 三元切换,旧逻辑保留。承载切换的已有文件被大量改写。**深度依赖多源(tx/kg like、MV、相似歌曲、高潮),需阶段 1 音源先到位。**

纯新增:
- `PlayDetail/Vertical/FeatureBtns.tsx`(258,依赖 SimilarSongsModal/MusicAddModal/tx-kg mv/ClimaxBtn)。
- `PlayDetail/Vertical/components/SongInfo.tsx`(167,依赖 useIsTxLiked/useIsKgLiked)。
- `PlayDetail/Vertical/Player/components/MoreBtn/ClimaxBtn.tsx`(80,依赖 kg/climax)。
- `PlayDetail/components/SettingPopup/settings/{SettingNewUI.tsx(26),SettingCoverSize.tsx(51),SettingMiniLyricAlign.tsx(65)}`。

侵入式改写:
- `PlayDetail/Vertical/index.tsx`:**重度**——Animated + PanResponder 滑动切歌(~110行)、isNewUI/miniLyricAlign 分支、PlayerPlaylist、showPlaylist 监听。
- `Vertical/components/Header.tsx`:**重度**——AnimatedIndicatorDot、页码圆点、定时器、多源 artist/album 跳转。
- `Vertical/Player/index.tsx`:新UI 渲染 FeatureBtns、隐藏 MoreBtn。
- `Vertical/Player/components/ControlBtn.tsx`:播放模式/心动模式按钮(依赖 wyApi、MUSIC_TOGGLE_MODE)。
- `Vertical/Player/components/MoreBtn/index.tsx`:引入 ClimaxBtn。
- `components/PlayDetailMenu.tsx`:**重度**——相似歌曲/MV/清缓存菜单、tx/kg like 状态(`userState.tx_liked_song_ids/kg_liked_song_ids`)。
- `components/SettingPopup/index.tsx`:引入 3 个新 setting 组件。

辅助新增(被上面引用):`src/components/SimilarSongsModal.tsx`、`ArtistDetail/SimilarArtistsModal.tsx`、`components/common/ImagePreviewModal.tsx`、`MusicAddModal`(若目标缺)、`useIsTxLiked/useIsKgLiked` hooks 与 `userState.*_liked_song_ids`(若目标缺需补 store 字段)。

> 字体**无需移植**:icomoon.ttf 两边 md5 相同、图标名 0 差异,新UI 所需图标(music_time/love-filled/lyric 等)已存在。`generate-font.js`/`react-native.config.js` 无运行时作用。

**验证**:设置开新UI后播放详情切到新布局;左右滑动切歌;封面大小/迷你歌词对齐生效;相似歌曲/MV/高潮按钮可用。

---

## 阶段 7:杂项(可独立推进)

- **播放历史**:`core/player/playHistory.ts`(81)+ `screens/Home/Views/PlayHistory/index.tsx`。需在 `utils/data.ts` 加 `getPlayHistory/savePlayHistory`、`types/` 加 `LX.Player.PlayHistoryItem/PlayHistorySource`、`core/player/player.ts` 播放时写历史、导航注册 `nav_play_history`。
- **设置开关**(纯新增 .tsx + 各自 index.tsx 挂载):`IsEnableSlideSwitchSong`、`IsPlayDetailNewUI`、`IsNewListUI`、`IsShowMyListSubMenu`(注意从 List 移到 Basic,勿重复挂)、`HideNavigationBar`、`Other/IsShowStartupGreeting`、`Player/IsSwipeToShowPlaylist`、`Search/BilibiliMultiPage`、`Theme/{IsMylistDynamicBg,IsSidebarDynamicBg,SectionOpacity,SubContainerOpacity}`。
- **音源测速** `SourceTest.tsx`(1430行,依赖各源 SDK 与音质枚举,最后做)。
- **多源功能 UI**:`AlbumDetail/index.tsx`(合并 diff 132行)、`ArtistDetail/index.tsx`(合并 189行)、`Home/Views/KgDailyRec/`(新增整目录 232行)。`DailyRec/FollowedArtists/SubscribedAlbums` 目标已预置多源壳(diff=0),SDK 接好即用。

---

## 全局必改的已有文件清单(汇总)

`package.json`、`src/config/defaultSetting.ts`、`src/types/{app_setting.d.ts,app.d.ts}`、`src/lang/{zh-cn,zh-tw,en-us}.json`、`src/utils/musicSdk/{index.js,tx/index.js,kg/index.js,tx/musicInfo.js,kg/musicInfo.js,kg/album.js,…}`、`src/utils/nativeModules/crypto.ts`、`src/screens/Home/index.tsx`、`Home/Vertical/Main.tsx` + `Horizontal/Main.tsx`、`Home/Vertical/DrawerNav.tsx`、`Setting/settings/Basic/index.tsx` + `List/index.tsx` + `SettingPopup/index.tsx`、`PlayDetail/Vertical/{index.tsx,components/Header.tsx,Player/index.tsx,Player/components/ControlBtn.tsx,Player/components/MoreBtn/index.tsx}`、`PlayDetail/components/PlayDetailMenu.tsx`、`core/player/player.ts`、`utils/data.ts`、`utils/webdav.ts`、`utils/fs.ts`、`android/.../crypto/CryptoModule.java`、`android/.../MainApplication`、`android/app/src/main/AndroidManifest.xml`。

## 风险点

- **R1(高)**:阶段 0 原生 sha1 + 阶段 5 识曲 Java 必须重编译,影响打包流水线;不重编则 QQ 签名/识曲失效。
- **R2(中)**:`AlbumDetail/ArtistDetail`(132/189 行 diff)、`PlayDetail` 多文件是真合并工作,目标可能有独立改动,需三方比对、勿整文件覆盖。
- **R3(中)**:新UI/FeatureBtns/PlayDetailMenu 强依赖 tx/kg(若不移音源会编译失败)——本计划按「先移源再移UI」规避。
- **R4(低-中)**:kg 登录依赖风控参数(sid/edt/infSign)、识曲硬编码 token、QQ 签名——服务端策略变更可能失效(功能性风险,非移植性)。
- **R5(低)**:包名替换遗漏会导致原生崩溃;移植 Java 务必全文替换 `lxwalnut`→`lxnetease`。

## 验证(端到端)

1. `npx tsc --noEmit` 全通过。
2. 重新 `npm run pack:android`(或 gradle assembleRelease)产出 APK。
3. 逐功能冒烟:三源搜索/歌单/每日推荐 → QQ/酷狗网页登录 → 识曲录音识别 → OneDrive/WebDAV 列目录播放 → 新UI 切换+滑动切歌+相似歌曲+MV+高潮 → 播放历史记录。
4. 关键加密单测:`zzcSign`、kg `generateSidEdt`、`hashSHA1`。

---

## 执行进度跟踪

- [x] 阶段 0:地基(依赖 + 原生 sha1 + txLog)— 已完成:CryptoModule.java 加 sha1、crypto.ts 加 hashSHA1、拷入 txLog/searchLog/playerLog、装 crypto-js/node-forge/@types
- [x] 阶段 1:音源 SDK(tx/kg/bilibili)— 已完成:加密工具+13功能模块+bilibili;共享文件逐字段合并(musicInfo/leaderboard/album/quality_detail/songList/musicSearch);三源注册+api-source.js;request.js 同步 params 支持与 QQ cookie 注入
- [x] 阶段 2:配置 / 类型 / 国际化— 已完成:constant.ts / globalData.ts / common.ts 新增配置项与枚举;多语言 zh-cn/zh-tw/en-us 补全各音源/新UI/云盘/识曲文案;类型声明 app_setting.d.ts / app.d.ts 补全
- [x] 阶段 3:登录 UI(QQ/酷狗/YouTube/Web)— 已完成:QQ/Kg/YouTube 三端 WebLoginModal + Manager;WebLoginModal/Manager 重构支持多平台;Setting Basic 页面增加 Cookie/登录入口;ArtistSelectorManager 适配多源
- [x] 阶段 4:云盘(OneDrive / WebDAV)— 已完成:OnlineList 路由挂载 OneDrive/WebDAV;listAction.ts 多源列表操作;挂载点文件(Main.tsx 等)增加 navActiveId 视图切换;DrawerNav 菜单项驱动
- [x] 阶段 5:听歌识曲(原生)— 已完成:MusicRecognitionModule.java(1440行)/Package.java(22行)放入recognition目录并改包名为com.lxnetease;MainApplication.java注册Package;AndroidManifest.xml加RECORD_AUDIO/FOREGROUND_SERVICE/FOREGROUND_SERVICE_MICROPHONE权限;src/core/musicRecognition.ts(153行)业务逻辑;src/utils/nativeModules/musicRecognition.ts(91行)RN桥接;DrawerNav.tsx底部加识曲按钮;ic_music_recognition.xml图标;**需重编译APK**
- [x] 阶段 6:播放详情新UI + 滑动切歌— 已完成:PlayDetail Vertical 多层 isNewUI 三元切换 + PanResponder 滑动切歌;Header 页码圆点/多源跳转;Player 新UI 渲染 FeatureBtns;PlayDetailMenu 增加相似歌曲/MV/高潮/txkg like;VideoPlayerModal 新增;SettingPopup 增加新UI/封面/歌词对齐设置;PlayerBar/PlayerPlaylist 适配
- [x] 阶段 7:杂项(播放历史 / 设置开关 / 测速 / 多源UI)— 已完成:MusicAddModal/MusicMultiAddModal 多源适配;AlbumDetail/ArtistDetail 多源合并;DailyRec 推荐歌曲;MyPlaylist 编辑;SearchResultList 多源;SourceTest 音源测速;Home Views 各页面多源挂载;event/stateEvent 新增多源事件
