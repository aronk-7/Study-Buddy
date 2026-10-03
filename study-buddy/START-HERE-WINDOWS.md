# Study Buddy: start from scratch on Windows

This download contains the source and a built dashboard, not a ready-made Windows
installer. These steps are for Windows 10/11 with a standard Intel/AMD 64-bit computer.
Keep an internet connection available while installing packages.

## 1. Install Node.js

Open [the official Node.js download page](https://nodejs.org/en/download).
Choose **Node.js 24**, **Windows**, **x64**, and the **Windows Installer (.msi)**.
Run the installer, accepting the normal defaults, including npm and adding Node to PATH.
If it offers an automatic extra-tools installer, you can leave that unchecked and use
step 5 if compilation tools turn out to be needed.

Close any existing terminals after installation. Open **Command Prompt** from the
Start menu and run:

```bat
node --version
npm --version
```

The first command should begin with `v24`. Both should print a version number.

## 2. Download and extract Study Buddy

Download `study-buddy-source.zip` from this chat. Right-click it → **Extract All**.
Move the extracted `study-buddy` folder somewhere simple, such as
`C:\Users\YourName\Documents\StudyBuddy`.

Open that folder in File Explorer. Make sure it contains `package.json`, `main`,
`renderer`, and `dist`. Work inside this folder, not inside the ZIP file.

Click File Explorer's address bar, type `cmd`, and press Enter.
This opens Command Prompt already in the correct folder.

## 3. Install the package manager and app dependencies

Enter each command separately and wait for it to finish:

```bat
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm rebuild
```

The first installs pnpm. The second downloads the app's packages. The third makes
SQLite match Electron's runtime. The initial download/rebuild can take several minutes.

If installation or rebuilding reports a Python, Visual Studio, MSVC, or `node-gyp`
error, follow step 5 below, then run `pnpm install --frozen-lockfile` and `pnpm rebuild`
again. The source uses a native SQLite library; prebuilt binaries can avoid compilation,
but the fallback needs Python and C++ build tools.

## 4. Launch and use the app

```bat
pnpm build
pnpm start
```

This automatically rebuilds the SQLite addon before launching.

On first launch, name your buddy and add one course. Today opens, and your buddy
appears over your other applications.
Keep this terminal open while running this source version.

Find the Study Buddy icon in the system tray beside the clock (you may need to click
its hidden-icons arrow). Right-click → **Open Study Buddy**.

In **Courses**:

1. Add or edit a course, e.g. `PSYC1001`, `Introduction to Psychology`, `Semester 2, 2026`.
2. Add an assessment with its due date and grade weighting.
3. Add a few milestones, such as research, outline, first draft, and revision.
4. Open **Today**, then use **Study this next** on the next-study suggestion.
5. The matching course is selected and the timer comes into view. Press **Start focus**. Completing the daily task also
   completes its linked milestone.

Suggestions prioritize unfinished assessments by earliest due date, with higher
weighting breaking ties. Within an assessment, they use the first unfinished milestone.
After the steps are done, the app suggests reviewing and submitting. Use **Mark submitted**
when the assessment is finished. You can edit deadlines and reopen assessments.

Milestone checkboxes in Courses track progress; mood rewards come from daily tasks
and completed Pomodoros. This keeps the planner simple and avoids extra penalties for
assessment deadlines. There is no university account or learning-platform connection.

Use **Let buddy roam** in the tray to pause/resume movement. Closing the dashboard
keeps the pet running. Choose **Quit Study Buddy** in the tray to stop it.

## 5. Install build tools only if the native build needs them

Follow the [official node-gyp Windows prerequisites](https://github.com/nodejs/node-gyp#on-windows).

**Python:** download a supported Python 3 Windows installer from
[Python.org](https://www.python.org/downloads/windows/). Python 3.12 or newer works
with this project's node-gyp version. Install it with the launcher and PATH option
when available. In a new Command Prompt, check `python --version` or `py --version`.

**C++ tools:** open [Microsoft's Visual Studio downloads](https://visualstudio.microsoft.com/downloads/).
Under **Tools for Visual Studio**, download **Build Tools for Visual Studio**.
In its installer, select **Desktop development with C++**. Keep the recommended
MSVC x64/x86 compiler and a Windows 10 or Windows 11 SDK selected. Install and restart
if requested. An existing Visual Studio 2022 installation with those components can
also work; you do not need Visual Studio Code to run Study Buddy.

Then reopen Command Prompt in the project folder and rerun:

```bat
pnpm install --frozen-lockfile
pnpm rebuild
pnpm start
```

If Python is installed but not detected, run `py --list-paths`, copy the Python executable
path, and set it for this terminal, replacing the example with your actual path:

```bat
set npm_config_python=C:\Path\To\Python\python.exe
pnpm rebuild
```

## 6. Create a normal installer (optional)

Once the app runs on Windows, build the installer:

```bat
pnpm dist:win
```

Open the `release` folder and run `Study-Buddy-1.3.0-Setup.exe`. Afterwards, launch Study
Buddy from Start or its shortcut; you won't need the terminal. Quit the source version
before opening the installed one.

## Common problems

| Message or symptom                             | What to do                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `node` or `npm` is not recognized              | Close/reopen Command Prompt; reinstall Node with PATH enabled if necessary.                                                                |
| `pnpm` is not recognized                       | Reopen Command Prompt after installing it globally.                                                                                        |
| PowerShell says scripts are disabled           | Use Command Prompt as described above, or use `npm.cmd` / `pnpm.cmd` in PowerShell.                                                        |
| `No package.json found`                        | Open the extracted folder containing `package.json` before running commands.                                                               |
| `NODE_MODULE_VERSION` / different Node version | Run `pnpm rebuild`, then launch again.                                                                                                     |
| Python / Visual Studio / SDK not found         | Install the components in step 5.                                                                                                          |
| No dashboard on later launches                 | Expected: open it from the tray. The buddy starts directly on the desktop.                                                                 |
| Pet is stationary                              | Enable **Let buddy roam** in the tray. It also pauses during focus, hover, breaks and short reactions; it sleeps after three idle minutes. |

Validated on macOS: build, logic tests, SQLite migrations/university planner tests,
and the actual Electron UI/roaming check. Windows execution and installer packaging still need a Windows run.

For GitHub packaging, push this project including `.github/workflows/windows.yml` to
your repository. Open **Actions → Windows installer → Run workflow**. After it
succeeds, download **Study-Buddy-Windows-Installer** from the run’s **Artifacts**,
extract it, and run the `.exe`. The project is not currently connected to a repository.
