# 离线构建工作流

根目录的 `gulpfile.babel.js` 只保留本地单机所需任务。日常使用应通过
`package.json` 中的命令进入构建，不需要全局安装 Gulp。

## 常用命令

```powershell
# 完整离线构建
corepack yarn build

# 构建并启动本地静态服务器
corepack yarn offline

# 生成压缩后的 Windows 安装包
corepack yarn build:installer

# 仅重新生成主脚本
corepack yarn build:app

# 仅重新生成 HTML、CSS、vendor 和本地化资源
corepack yarn build:web
```

`build` 与 `build:offline` 等价。仓库不再提供在线/CDN release、Docker、
服务端部署或 Git 自动发布任务。

## 完整构建顺序

1. `clean:all` 清空 `dist`。
2. `vendor`、`css`、`html` 并行生成静态入口。
3. `localization:copy` 合并英文和简体中文资源。
4. `rsx:packages` 分析源码并生成资源清单。
5. `js` 通过 Browserify 打包 CoffeeScript、JavaScript、Handlebars 和
   GLSL。
6. `rsx:copy` 复制对战、牌组、挑战和典籍需要的本地资源。
7. `rsx:copy:web` 复制 favicon 等入口文件。

输出目录固定为 `dist/src`。

## 资源策略

`gulp/rsx.js` 的 `shouldIncludeResourcePackage` 是离线资源边界。商店、表情、
竞技场、开包、宝箱和赛季奖励目录不会进入离线发行物。修改过滤规则时必须同步
更新 `test/unit/offline/resource_filter.js`，并确认对战和典籍资源仍可加载。

## 压缩与调试

开发构建保留 source map；`--env staging` 只用于开启现有的 JS/CSS/HTML
压缩逻辑，不代表连接 staging 服务。配置层始终返回 `offlineMode: true`，
所有 URL 保持本地相对路径。
