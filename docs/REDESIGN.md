# HIGHLIGHT Studio 官网重构说明

## 1. 参考研究（做了什么、拿来了什么）

| 参考 | 排版 / 留白 | 动效节奏 | 加载性能 | 本站采用 |
| --- | --- | --- | --- | --- |
| Apple | 一屏只讲一件事，超大标题 + 一行副文，大量负空间 | 滚动驱动、钉住（pin）讲完再放行 | 图片按断点下发、视频/大图按需加载 | 每一幕一个主句；品牌片一幕滚动钉住 |
| Linear | 深色底、细线网格、等宽小字做标签 | 短促、克制的 fade/translate，曲线统一 | 极少的首屏 JS | 统一缓动 `cubic-bezier(.16,1,.3,1)`；等宽 kicker |
| Vercel | 网格线、强对比、留白均匀 | 只在交互点出现微动效 | 字体子集、静态优先 | 字体子集化 WOFF2；纯静态，无构建 |
| Stripe | 卡片内容层级清晰，渐变高光跟随指针 | 指针高光只改 CSS 变量 | 动画只用 transform/opacity | 作品卡 pointer 高光（只写 `--mx/--my`） |
| trae | 底部大字标 + 幕布式揭开 | WebGL 网格扭曲，空闲回弹 | 组件进入视口才初始化 | 页脚 1:1 复刻其 grid-distortion |

> trae.cn 在构建环境中返回 403（地域限制），因此以同一套前端的 trae.ai 线上包为准：`grid-distortion` 组件，15×15 网格 DataTexture，`mouse=.25 / strength=.15 / relaxation=.9`，NearestFilter，片元着色器 `texture(uTex, uv - 0.02 * offset.rg)`，外层 `position:fixed` 揭幕。

## 2. 叙事结构大纲

| 幕 | 名称 | 讲什么 | 动效 |
| --- | --- | --- | --- |
| 序 | 开灯 | 唯一保留的品牌文化：「以人文铸科技」。黑暗里一束光打下来，字被逐字照亮。 | 光束 + 背景网格淡入；标题逐行 mask 揭开；向下滚动时整幕缩小、变暗退场（GSAP scrub） |
| 一 | 越界 | 第一部作品《越权者》：规则被改写的世界。 | 扫描线循环、红/青色层错位、舞台缓慢推近（scroll parallax） |
| 二 | 放映 | 品牌片：片子还在剪，留一块银幕。 | 影院画框，倒计时 leader（3→2→1），时间码，滚动钉住期间完成倒计时后出现 “MAY BE COMING SOON?” |
| 三 | 作品 | 所有产品不分类，统一放在一面墙：CubexDesktop、CubexTeam、Cubex-Echo、Cubex Aura、OurMC、Gelysium、越权者及全部媒体账号。原介绍保留。 | 卡片分批错峰进场；指针跟随高光；Logo 悬停微动 |
| 四 | 幕后 | 做这些事的人：点中点、方块守护者、Logist（已删除子团队）。 | 头像灰度 → 彩色、轻微放大；卡片错峰进场 |
| 终 | 留白 | 故事留一个位置给你：招募方向跑马灯 + 联系 CTA，进入加入我们页（9 个岗位，已去掉 AI 工程师）。 | 跑马灯（离屏暂停）；CTA 高亮扫光 |
| 尾 | 字标 | 红底 HIGHLIGHT STUDIO 字标从信息区下方被“揭开”，鼠标划过产生块状扭曲后回弹。 | WebGL2 grid distortion（trae 复刻） |

加入我们页（`join.html`）延续同一叙事：招募令 → 九个位置 → 怎么找到我们 → 字标页脚。

## 3. 动画方案

- **CSS 进场**：`IntersectionObserver` 给 `.rv` 元素加 `.in`，只过渡 `transform`/`opacity`/`clip-path`，触发一次即 `unobserve`。
- **GSAP + ScrollTrigger**（本地 vendor，`defer` 加载）：仅用于需要滚动 scrub/pin 的三处——序章退场、越权者舞台推近、品牌片钉住倒计时。移除了未使用的 SplitText、ScrollToPlugin。
- **指针高光**：`pointermove` 里只写 CSS 自定义属性，并用 rAF 合帧。
- **导航**：滚动方向决定胶囊导航显隐；顶部红色进度条用 `transform: scaleX()`。
- **页脚 WebGL2**：原生 WebGL2（无 three.js，省约 600KB），15×15 `RG32F` 数据纹理，每帧 `offset *= 0.9`，鼠标速度按距离衰减推动网格；无 WebGL2 时退回静态图片。
- **减少动态效果**：`prefers-reduced-motion: reduce` 时 CSS 动画/过渡缩短为瞬时，跑马灯改为静态换行，光晕移除；JS 不注册 ScrollTrigger、不启动 WebGL、不做 parallax，所有内容直接可见。

## 4. 性能优化

- 无框架、无构建，首屏只有 HTML + 1 个 CSS + 1 个脚本（GSAP 均 `defer`）。
- 字体：`pyftsubset` 子集化为 WOFF2，`unicode-range` 限定拉丁区，`font-display: swap`；中文使用系统字体，不下载 CJK 字体。
- 图片：头像、字标、Logo 转 WebP 并按显示尺寸压缩；非首屏图片 `loading="lazy" decoding="async"`，并写明 `width/height` 防止布局抖动。
- 页脚字标图片用 `data-src`，接近视口（240px）才加载并初始化 WebGL。
- rAF 只在需要时运行：页脚离屏或静止（能量 < 0.05）即停止；跑马灯离屏 `animation-play-state: paused`。
- 所有动画只动合成层属性（transform / opacity），避免触发布局，目标 60fps。
- 删除原站 404 资源引用风险：Logist 头像缺失时自动降级为首字母占位。
