# Information System Simulator Demo

![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?logo=javascript&logoColor=111111)

*Read this in other languages: [简体中文 (Chinese)](README_zh-CN.md)*

![University Canteen IS Game hero](docs/images/pixel_art_large.png)

**Maintainer:** Yusi ([boygotflames](https://github.com/boygotflames))

**Repository:** [Information-System-Simulator-Demo](https://github.com/boygotflames/Information-System-Simulator-Demo)

## Project Vision & Educational Value

This project exists to make Information Systems concepts visible, concrete, and interactive. It presents a 2D university canteen simulation where queues, routing, transactions, dining flow, tray return logistics, reporting, planning, and operational monitoring can all be observed in one connected environment. Instead of treating Information Systems as abstract theory, the project shows how people, processes, data, software, and day-to-day operational decisions interact inside a living system.

As an educational demo, it helps students understand that real-world systems are not isolated software screens. They are operational ecosystems. By watching the canteen floor and management dashboard together, learners can connect classroom ideas to practical system behavior.

## Feature Overview

- Live canteen floor simulation with player movement, service counters, dining tables, and tray-return flow
- Queue and movement behavior that makes operational bottlenecks and routing visible
- Dining lifecycle coverage from ordering to seating, eating, tray return, and exit
- Management dashboard and operations console for monitoring queues, sales, inventory, reporting, and planning
- Educational mapping between gameplay events and Information Systems ideas such as people, processes, software, data, and decision support
- Lightweight browser-based architecture with an Electron portable packaging path for demo use

## Quick Start

If you just want to run the project on Windows, use the portable desktop release instead of cloning the repository.

1. Open the release page: [Version 1.0.0 Release](https://github.com/boygotflames/Information-System-Simulator-Demo/releases/tag/1.0.0)
2. Download **`University Canteen IS Game-1.0.0-portable.exe`**
3. Place it anywhere you like, such as your Desktop, a normal folder, or a USB drive
4. Double-click to launch

This build is plug-and-play and requires **no installation**.

If Windows SmartScreen appears, click **More info** and continue only if you trust the file source.

## For Developers / Contributors

Clone the repository, open it in your preferred editor, and run a simple local server for browser testing. The project is intentionally lightweight, so the Python built-in server is a practical default.

```bash
git clone https://github.com/boygotflames/Information-System-Simulator-Demo.git
cd Information-System-Simulator-Demo
python -m http.server 8000
```

Then open Google Chrome and visit:

```text
http://localhost:8000
```

If you want to test the packaged desktop shell, the repository also supports Electron-based portable Windows builds.

## Project Structure

- `index.html`: primary web entry point
- `css/`: UI shell and styling
- `js/`: simulation logic, rendering, controllers, and systems
- `assets/`: in-repo image assets, sprites, and visual resources
- `docs/`: documentation and repository-facing support files

## Open Source / License

This is an open-source project. You are welcome to fork it, study it, adapt it, and remake it for your own educational or practical benefit under the terms of the MIT License. See the [LICENSE](LICENSE) file for the full license text.

Project attribution: maintained by Yusi ([boygotflames](https://github.com/boygotflames)).
