# Study Buddy

Study Buddy is a desktop study companion that lives alongside students while they work. It connects university deadlines, daily tasks and focus sessions to a small virtual buddy that studies, rests and celebrates alongside the student.

- A duck or penguin buddy that roams over other applications and responds to hello.
- Pomodoro focus: 25 minutes of study, 5-minute breaks, a 20-minute break after four completed sessions. Durations are adjustable.
- University courses, assessment deadlines and grade weighting.
- Small assessment milestones with estimated Pomodoros.
- A prominent next-step suggestion that adds a daily task and prepares the matching focus timer.
- Daily streaks and lasting buddy growth. Taking a day off never removes growth.
- Local-only storage; no accounts or remote services.

## Run on macOS

Install Node.js 24 from [Node.js](https://nodejs.org/en/download), extract `study-buddy-source.zip`, then open Terminal inside the extracted `study-buddy` folder:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm rebuild
pnpm build
pnpm start
```

`pnpm start` rebuilds the SQLite native addon before launching Electron. Keep Terminal open while using the source version. If a native build needs Apple's compiler tools, run `xcode-select --install`, finish installation, then run `pnpm rebuild` again.

For development instead: `pnpm dev` starts Vite and Electron together. A browser tab alone does not provide the desktop app or local data.

## Run on Windows / create an installer

See [START-HERE-WINDOWS.md](START-HERE-WINDOWS.md) for beginner setup, Node.js, and optional Python/C++ build tools. The same install/build/start commands work on Windows.

To package on a Windows x64 computer:

```sh
pnpm dist:win
```

The output is `release/Study-Buddy-1.3.0-Setup.exe`. Native modules must be built on the target OS.

Alternatively, push this project, including `.github/workflows/windows.yml`, to your GitHub repository. In **Actions → Windows installer → Run workflow**, choose the main branch and run it. Once it succeeds, download **Study-Buddy-Windows-Installer** under the run's **Artifacts**, extract the download, and run the `.exe`. The workflow also runs on pushes to main and pull requests. No repository or hosted installer is configured in this source download.

A small optional unsigned macOS ZIP target is configured:

```sh
pnpm dist:mac
```

macOS packaging/signing and Windows execution are not verified by the local macOS checks. Use `pnpm start` for the Mac presentation.

## First launch and the core loop

1. Name your buddy, then add one course. Setup opens Today and shows the desktop buddy.
2. Add an assessment and a few milestones in Courses.
3. Today shows the next unfinished milestone for the closest unfinished assessment. Higher grade weighting breaks deadline ties.
4. **Study this next** creates or reuses today's linked task, selects its course, and brings the timer into view. Press **Start focus** when ready.
5. The desktop buddy settles near a screen edge and studies with a tiny book. Completing focus celebrates for four seconds, then starts a break with the resting buddy.
6. Check off daily tasks to record progress and update linked milestones. Mark the assessment submitted in Courses when finished; reopen it if needed.

If a timer is already active or paused, finish or reset it before choosing another suggestion. Milestone checkboxes in Courses track academic progress; daily tasks and completed Pomodoros produce buddy reactions.

## Desktop companion

Choose **Duck** or **Penguin** on the Buddy page. The choice is saved and updates the desktop buddy immediately. Switching keeps the same name and study progress.

Hover or click the buddy for a friendly bubble. **Open Study Buddy** opens Today. Clicking never awards progress or rewards. Transparent padding normally passes mouse input through; the buddy and visible bubble remain interactive.

The Buddy page and tray offer **Let buddy roam / Pause roaming** and **Move buddy**. In movement mode, drag the buddy and press **Done**; it also finishes automatically after 30 seconds. Roaming pauses during focus, breaks, hover and short reactions. When idle for three minutes, the buddy gets sleepy.

Closing the dashboard keeps the buddy and timer running. Later launches show the desktop buddy; open Today from its bubble or the tray. Choose **Quit Study Buddy** in the tray to exit. Restart restores an interrupted timer paused; sleep and screen lock pause it too.

For a presentation, add Networking (`COSC1111`) and Programming (`IFB102`), a report due tomorrow and a later assignment, then milestones such as network design, subnet calculations, analysis and proofread. Change focus to **1 minute** in Settings for the demonstration, then restore **25**. Production starts with empty academic records.

## Local data and compatibility

The Electron user-data directory contains `study-buddy.sqlite` and `buddy-state.json`. The main process owns SQLite, timer and buddy state. Sandboxed renderers use a narrow preload API with context isolation; external navigation is blocked.

Existing courses, tasks, sessions and assessment data are retained. Compatibility intentionally keeps the unused `activity`, `mood_history` and `study_segments` tables, historical task flags/day summaries, and any old JSON preference fields. These do not drive the current experience. Schema upgrades add fields and indexes without deleting existing rows. Buddy growth is monotonic, including after a missed day and subsequent sessions.

## Source layout

```text
main/       Electron lifecycle/tray/IPC, timer engine, SQLite, academic queries, overlay
renderer/   Today, Courses, Buddy, Settings; shared duckling and focus/task components
scripts/    Development launcher, SQLite integration runner, Electron smoke check
tests/     Domain, engine, roaming, SQLite and academic compatibility checks
```

## Validation and demo limitations

```sh
pnpm test
pnpm test:sqlite
pnpm build
pnpm test:electron
```

The Electron check uses temporary data and a real one-minute focus session. It exercises onboarding, four pages, next-step selection without autostart, desktop clicks, movement/roaming, focus/celebration/rest, and persistence. Set `STUDY_BUDDY_CAPTURE_DIR` to a folder to save screenshots.

Local validation uses macOS. Windows installer creation is delegated to the preserved Windows workflow and needs a successful run before delivery. Native notifications depend on OS permission/support. Exclusive full-screen applications and OS security screens can cover third-party overlays; ordinary applications are the safest live-demo environment. Source launch requires dependencies and a working native SQLite build.
