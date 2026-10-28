using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("AIOStreams-rebuild")]
[assembly: AssemblyDescription("AIOStreams yerel arayüz başlatıcısı")]
[assembly: AssemblyVersion("1.0.1.0")]

internal static class RebuildLauncher
{
    private delegate bool WindowCallback(IntPtr window, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool EnumWindows(WindowCallback callback, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent, WindowCallback callback, IntPtr parameter);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsZoomed(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool ShowWindowAsync(IntPtr window, int command);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rectangle rectangle);
    [DllImport("user32.dll")] private static extern bool GetClientRect(IntPtr window, out Rectangle rectangle);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
    private struct Rectangle { public int Left, Top, Right, Bottom; }

    private static IntPtr FindWindow(int processId)
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows(delegate(IntPtr window, IntPtr parameter)
        {
            uint owner;
            GetWindowThreadProcessId(window, out owner);
            if (owner == (uint)processId)
            {
                StringBuilder name = new StringBuilder(256);
                GetClassName(window, name, name.Capacity);
                if (name.ToString() == "AIOStreamsDesktop") { found = window; return false; }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    private static List<Process> Running(string executable)
    {
        List<Process> result = new List<Process>();
        foreach (Process process in Process.GetProcessesByName("aiostreams-desktop"))
        {
            try
            {
                if (string.Equals(process.MainModule.FileName, executable, StringComparison.OrdinalIgnoreCase))
                    result.Add(process);
            }
            catch (InvalidOperationException) { }
        }
        return result;
    }

    private static string CommandLine(Process process)
    {
        using (ManagementObjectSearcher search = new ManagementObjectSearcher(
            "SELECT CommandLine FROM Win32_Process WHERE ProcessId=" + process.Id))
        using (ManagementObjectCollection rows = search.Get())
            foreach (ManagementObject row in rows)
                using (row) { return Convert.ToString(row["CommandLine"]); }
        return string.Empty;
    }

    private static bool LayoutFits(IntPtr window, out Rectangle bounds)
    {
        Rectangle client;
        GetWindowRect(window, out bounds);
        GetClientRect(window, out client);
        if (!IsWindowVisible(window) || IsIconic(window) || client.Right < 320 || client.Bottom < 200 ||
            client.Right > bounds.Right - bounds.Left + 2 || client.Bottom > bounds.Bottom - bounds.Top + 2) return false;
        IntPtr view = IntPtr.Zero;
        EnumChildWindows(window, delegate(IntPtr child, IntPtr parameter)
        {
            StringBuilder name = new StringBuilder(256);
            GetClassName(child, name, name.Capacity);
            if (name.ToString() == "WRY_WEBVIEW") { view = child; return false; }
            return true;
        }, IntPtr.Zero);
        if (view == IntPtr.Zero) return false;
        Rectangle page;
        GetClientRect(view, out page);
        return Math.Abs(page.Right - client.Right) <= 2 && Math.Abs(page.Bottom - client.Bottom) <= 2;
    }

    private static bool WaitForLayout(IntPtr window, int milliseconds, out Rectangle bounds)
    {
        Stopwatch timer = Stopwatch.StartNew();
        Stopwatch stable = null;
        bounds = new Rectangle();
        while (timer.ElapsedMilliseconds < milliseconds)
        {
            if (LayoutFits(window, out bounds))
            {
                if (stable == null) stable = Stopwatch.StartNew();
                if (stable.ElapsedMilliseconds >= 400) return true;
            }
            else stable = null;
            Thread.Sleep(100);
        }
        return false;
    }

    [STAThread]
    private static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            string executable = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "aiostreams-desktop", "current", "aiostreams-desktop.exe");
            string web = Path.Combine(root, "web");
            string index = Path.Combine(web, "index.html");
            if (!File.Exists(executable) || !File.Exists(index))
                throw new InvalidOperationException("AIOStreams rebuild dosyaları bulunamadı.");
            string arguments = "--web-dir \"" + web + "\"";
            List<Process> running = Running(executable);
            bool restart = false;
            foreach (Process process in running)
                if (CommandLine(process).IndexOf(arguments, StringComparison.OrdinalIgnoreCase) < 0 ||
                    File.GetLastWriteTimeUtc(index) > process.StartTime.ToUniversalTime()) restart = true;
            if (restart)
            {
                foreach (Process process in running)
                {
                    IntPtr oldWindow = FindWindow(process.Id);
                    if (oldWindow == IntPtr.Zero || !PostMessage(oldWindow, 0x0010, IntPtr.Zero, IntPtr.Zero) ||
                        !process.WaitForExit(12000))
                        throw new InvalidOperationException("Açık AIOStreams penceresini kapatıp kısayolu yeniden açın.");
                }
                running.Clear();
            }
            if (running.Count == 0)
                Process.Start(new ProcessStartInfo(executable, arguments) {
                    UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(executable), WindowStyle = ProcessWindowStyle.Normal
                });
            Stopwatch timer = Stopwatch.StartNew();
            IntPtr window = IntPtr.Zero;
            int processId = 0;
            while (window == IntPtr.Zero && timer.Elapsed.TotalSeconds < 20)
            {
                foreach (Process process in Running(executable))
                {
                    window = FindWindow(process.Id);
                    // The native app initially creates a hidden window while it
                    // constructs mpv and WebView2. Do not show it ahead of Tao.
                    if (window != IntPtr.Zero && IsWindowVisible(window)) { processId = process.Id; break; }
                    window = IntPtr.Zero;
                }
                if (window == IntPtr.Zero) Thread.Sleep(200);
            }
            if (window == IntPtr.Zero) throw new InvalidOperationException("AIOStreams penceresi oluşturulamadı.");
            if (IsIconic(window)) ShowWindowAsync(window, 9);
            Rectangle bounds;
            if (!WaitForLayout(window, 5000, out bounds))
            {
                // Repair a window left inconsistent by an older launcher only
                // after native initialization, preserving its maximized state.
                bool maximized = IsZoomed(window);
                ShowWindowAsync(window, 9);
                Thread.Sleep(500);
                if (maximized) ShowWindowAsync(window, 3);
                if (!WaitForLayout(window, 5000, out bounds))
                    throw new InvalidOperationException("AIOStreams pencere ve içerik boyutları eşleştirilemedi.");
            }
            SetForegroundWindow(window);
            File.WriteAllText(Path.Combine(root, "launch-status.log"), string.Format(
                "{0:o} Ready launcher=exe layout=matched pid={1} window={2} size={3}x{4}", DateTimeOffset.Now,
                processId, window, bounds.Right - bounds.Left, bounds.Bottom - bounds.Top));
            return 0;
        }
        catch (Exception error)
        {
            try { File.WriteAllText(Path.Combine(root, "launch-error.log"), error.ToString()); } catch { }
            MessageBox.Show(error.Message, "AIOStreams-rebuild", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
