# Information System Simulator Demo

![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?logo=javascript&logoColor=111111)

![University Canteen IS Game hero](docs/images/pixel_art_large.png)

**Maintainer / 维护者:** Yusi ([boygotflames](https://github.com/boygotflames))

## Project Vision & Educational Value / 项目愿景与教学价值

This project exists to make Information Systems concepts visible, concrete, and interactive. It presents a 2D university canteen simulation where queues, routing, transactions, dining flow, tray return logistics, reporting, planning, and operational monitoring can all be observed in one connected environment. Instead of treating Information Systems as abstract theory, the project shows how people, processes, data, software, and day-to-day operational decisions interact inside a living system.

这个项目的目标，是把信息系统课程中常见但抽象的概念变得可见、具体、可交互。项目通过一个 2D 大学校园食堂模拟场景，把排队、路径流动、交易处理、用餐流程、餐盘回收、运营报表、计划决策和现场监控放到同一个可观察的环境里。它不再把信息系统当成纯理论，而是展示人员、流程、数据、软件与日常运营决策如何在真实系统中相互连接。

As an educational demo, it helps students understand that real-world systems are not isolated software screens. They are operational ecosystems. By watching the canteen floor and management dashboard together, learners can connect classroom ideas to practical system behavior.

作为教学演示，它帮助学生理解：现实中的信息系统并不是孤立的软件界面，而是一个完整的运营生态。通过同时观察食堂现场和管理面板，学习者可以把课堂中的概念与实际系统行为建立联系。

## Feature Overview / 功能概览

- Live canteen floor simulation with player movement, service counters, dining tables, and tray-return flow
- Queue and movement behavior that makes operational bottlenecks and routing visible
- Dining lifecycle coverage from ordering to seating, eating, tray return, and exit
- Management dashboard and operations console for monitoring queues, sales, inventory, reporting, and planning
- Educational mapping between gameplay events and Information Systems ideas such as people, processes, software, data, and decision support
- Lightweight browser-based architecture with an Electron portable packaging path for demo use

- 实时食堂楼层模拟，包含玩家移动、服务档口、用餐区域与餐盘回收流程
- 可视化的排队与移动行为，帮助展示运营瓶颈与路径流动
- 从点餐、入座、用餐到回收餐盘和离场的完整就餐生命周期
- 用于监控排队、销售、库存、报表和计划决策的管理面板与运营控制台
- 将游戏中的行为映射到信息系统核心概念，如人员、流程、软件、数据与决策支持
- 轻量级浏览器架构，并支持 Electron 便携版打包，适合演示使用

## For Users / 普通用户

If you want to use the desktop version on Windows, copy the portable executable build to any folder, desktop location, or USB drive and launch it directly. No installation is required. The current portable build artifact is named `University Canteen IS Game-1.0.0-portable.exe`.

如果你希望在 Windows 上直接使用桌面版，可以将便携版可执行文件复制到任意文件夹、桌面位置或 U 盘中，然后直接运行。它不需要安装。当前便携版构建产物名称为 `University Canteen IS Game-1.0.0-portable.exe`。

- Download or copy the portable executable
- Place it anywhere you like, including a USB drive
- Double-click to launch
- No installation is required on the target machine
- If Windows SmartScreen appears, review the file, choose **More info**, and continue only if you trust the source

- 下载或复制便携版可执行文件
- 可以放在任意位置，包括 U 盘
- 双击即可启动
- 目标机器无需安装
- 如果 Windows SmartScreen 弹出提示，请在确认来源可信后点击 **More info** 再继续运行

## For Developers / Contributors / 开发者与贡献者

Clone the repository, open it in your preferred editor, and run a simple local server for browser testing. The project is intentionally lightweight, so the Python built-in server is a practical default.

你可以先克隆仓库，再用自己习惯的编辑器打开，并使用简单的本地服务器在浏览器中测试。项目本身保持轻量，因此 Python 自带的本地服务器是一个很实用的默认方案。

```bash
git clone <your-repository-url>
cd canteen-IS-game
python -m http.server 8000
```

Then open Google Chrome and visit:

然后使用 Google Chrome 打开：

```text
http://localhost:8000
```

If you want to work with the packaged desktop shell, the repository also supports Electron-based portable Windows builds.

如果你希望使用打包后的桌面外壳进行开发测试，仓库也支持基于 Electron 的 Windows 便携版构建。

## Project Structure / 项目结构

- `index.html`: primary web entry point
- `css/`: UI shell and styling
- `js/`: simulation logic, rendering, controllers, and systems
- `assets/`: in-repo image assets, sprites, and visual resources
- `docs/`: documentation and repository-facing support files

- `index.html`：Web 主入口
- `css/`：界面样式与外壳布局
- `js/`：模拟逻辑、渲染层、控制器与系统代码
- `assets/`：仓库内的图像资源、精灵图与视觉素材
- `docs/`：文档与面向仓库展示的支持文件

## Open Source / License / 开源与许可

This is an open-source project. You are welcome to fork it, study it, adapt it, and remake it for your own educational or practical benefit under the terms of the MIT License. See the [LICENSE](LICENSE) file for the full license text.

这是一个开源项目。你可以在 MIT License 的许可范围内自由 fork、学习、修改、改编，并将其重新制作成适合自己教学或实践用途的版本。完整许可内容请参见 [LICENSE](LICENSE) 文件。

Project attribution: maintained by Yusi ([boygotflames](https://github.com/boygotflames)).

项目署名：由 Yusi（[boygotflames](https://github.com/boygotflames)）维护。
