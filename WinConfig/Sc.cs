using System;
using System.Collections.Generic;
using System.Linq;

namespace WinConfig
{
    static class Sc
    {
        public static bool Installed()
        {
            var result = false;
            try
            {
                var cmdOut = ExecSc($"query {Config.ServiceName}");
                result = true;
            }
            catch { }
            return result;
        }

        public static bool Running()
        {
            var result = false;
            try
            {
                var cmdOut = ExecSc($"query {Config.ServiceName}");
                result = cmdOut.Single(l => l.Contains("STATE")).Split(" : ").Last().Contains("RUNNING");
            }
            catch { }
            return result;
        }

        public static void Delete()
        {
            ExecSc($"delete {Config.ServiceName}");
        }

        public static void Stop()
        {
            ExecSc($"stop {Config.ServiceName}");
        }

        public static void Start()
        {
            ExecSc($"start {Config.ServiceName}");
        }

        public static void UpdateService(Config config)
        {
            ExecSc($"config {Config.ServiceName} start={(config.Autostart ? "auto" : "demand")} binPath=\"{config.Cmd()}\"");
        }

        public static void Install(Config config)
        {
            var a = $"create {Config.ServiceName} start={config.AutostartStr()} binPath=\"{config.Cmd()}\"";
            ExecSc(a);
        }

        public static string ServiceCmd()
        {
            var cmdOut = ExecSc($"qc {Config.ServiceName}");
            return cmdOut.Single(l => l.Contains("BINARY_PATH_NAME")).Split(" : ").Last().Trim();
        }

        public static IEnumerable<string> ExecSc(string args)
        {
            var procStartInfo = new System.Diagnostics.ProcessStartInfo("sc.exe", args);
            procStartInfo.RedirectStandardOutput = true;
            procStartInfo.UseShellExecute = false;
            procStartInfo.CreateNoWindow = true;
            var proc = new System.Diagnostics.Process();
            proc.StartInfo = procStartInfo;
            proc.Start();
            var cmdOut = proc.StandardOutput.ReadToEnd();
            if (proc.ExitCode != 0) throw new Exception(cmdOut);
            return cmdOut.Split("\r\n");
        }
    }
}
