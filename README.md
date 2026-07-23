# Duelyst Offline

![Duelyst Logo](app/resources/ui/brand_duelyst.png)

这是《Duelyst》的本地单机版本。游戏、电脑 AI、牌组、设置和挑战进度均在本机运行和保存，不需要 Firebase、PostgreSQL、Redis、Docker 或在线游戏服务器。

## 快速开始

安装 Node.js 后，在仓库根目录运行：

```powershell
corepack yarn workspaces focus
corepack yarn offline
```

首次构建完成后，可以用下面的命令直接启动已有版本：

```powershell
corepack yarn start:offline
```

构建 Windows 安装包：

```powershell
corepack yarn build:installer
```

安装包会生成到 `dist/installer`。详细的运行方式、存档位置和已支持功能参见[离线单机说明](docs/OFFLINE_SINGLEPLAYER.md)。

## 中文与文本维护

游戏支持英文和简体中文。新增或修改玩家可见文本时，请统一写入本地化资源，不要直接写死在模板或业务代码中。具体约定参见[本地化指南](docs/LOCALIZATION.md)。

## 开发文档

- [文档索引](docs/README.md)
- [离线单机架构](docs/ARCHITECTURE.md)
- [贡献指南](docs/CONTRIBUTING.md)
- [Gulp 构建说明](docs/GULP.md)

## License

本项目采用 Creative Commons Zero v1.0 Universal 许可证，详见 [LICENSE](LICENSE)。
