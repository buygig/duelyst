# 离线单机架构

这个分支只有一个产品形态：在浏览器或 Electron 中运行的本地单机游戏。
它不再包含 HTTP API、多人游戏服务器、Worker、Firebase 服务、PostgreSQL、
Redis、Socket.IO、Docker、Terraform 或云端发布链路。

## 运行边界

```text
浏览器 / Electron
  -> Backbone + Marionette 界面（app/ui）
  -> 本地管理器与兼容适配层（app/offline、app/ui/managers）
  -> 游戏规则与会话（app/sdk）
  -> 电脑 AI（packages/game-ai）
  -> localStorage / Electron 用户数据目录
```

- `app/index.coffee` 等待本地化资源就绪后启动应用。
- `app/application.coffee` 只连接离线需要的管理器，并负责菜单、牌组选择、
  挑战和对局界面之间的导航。
- `app/common/session2.coffee` 在离线模式下自动创建固定的本地玩家会话。
- `app/offline/local_api.js` 实现离线功能需要的有限 API 兼容面；未知路由会
  明确报错，避免静默伪造成功。
- `app/offline/local_firebase.js` 是仅在进程内和本机存储上工作的
  Firebase-compatible 适配器。`packages/backfire` 只把 Backbone
  Model/Collection 接到这个本地适配器。
- `app/common/storage.js` 负责浏览器存档；Electron 会将同样的数据保存到自身
  的用户数据目录。
- `app/sdk` 是确定性的游戏规则、卡牌、行动、验证器、挑战与序列化层。
- `packages/game-ai` 是从旧服务端独立出来的纯游戏 AI，不依赖网络或数据库。

## 内容与资源

- 卡牌、规则、挑战和典籍数据位于 `app/sdk`。
- 玩家可见字符串统一位于 `app/localization/locales`；具体约定见
  [LOCALIZATION.md](LOCALIZATION.md)。
- 图片、音频、字体和特效位于 `app/resources`。
- 离线构建会排除商店、表情、竞技场、开包、宝箱和赛季奖励等纯在线资源，
  但保留对战、牌组、挑战和典籍所需资源。

## 构建与桌面壳

- `gulpfile.babel.js` 只注册本地构建任务。
- `gulp/bundler.js` 用 Browserify 生成游戏 bundle。
- `gulp/rsx.js` 生成资源包清单并复制离线资源。
- `desktop-offline` 是唯一桌面壳，只打包 `dist/src`，不启动任何本地后端。
- `scripts/serve_offline.js` 是开发时使用的静态文件服务器。

## 依赖方向

游戏规则和 AI 不应依赖界面或桌面壳；本地兼容适配层可以依赖规则层，但不得
发起外部网络请求。新增功能若需要持久化，应扩展本地存储模型或显式版本化的
存档结构，而不是重新引入在线服务接口。
