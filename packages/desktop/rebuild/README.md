# Local Windows rebuild launcher

`Launcher.cs` builds a Windows GUI exe with no console or PowerShell runtime. Place the compiled launcher beside a `web` folder containing the custom standalone build. It starts the installed `%LOCALAPPDATA%\aiostreams-desktop\current\aiostreams-desktop.exe` with `--web-dir` and retains the existing AIOStreams Desktop profile.

Compile with the Windows .NET Framework compiler (`Microsoft.NET\Framework64\v4.0.30319\csc.exe`), using `/target:winexe /reference:System.Windows.Forms.dll /reference:System.Management.dll`. An optional `/win32icon` can use the installed AIOStreams icon. Point the desktop shortcut directly at the resulting exe with normal window style.

The launcher identifies the actual `AIOStreamsDesktop` window rather than Tao's event helper. It waits for the native app to show its initialized window, restores a minimized instance, and validates matching frame/client/WebView bounds before reporting readiness. A bounded restore/maximize cycle repairs inconsistent geometry left by an older launcher. An already running different web build is closed gracefully before switching; force termination and profile deletion are not used.
