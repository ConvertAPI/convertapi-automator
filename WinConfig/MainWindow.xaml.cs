using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using Microsoft.WindowsAPICodePack.Dialogs;

namespace WinConfig
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            ExecFileInput.Text = Path.Combine(Directory.GetCurrentDirectory(), "convertapi-automator.exe");
                
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {

            // Display the command output.
            Label1.Content = ServiceCmd();

        }

        private void DeleteService(Config config)
        {
            ExecSc($"delete {Config.ServiceName}");
        }

        private void StopService(Config config)
        {
            ExecSc($"stop {Config.ServiceName}");
        }

        private void StartService(Config config)
        {
            ExecSc($"start {Config.ServiceName}");
        }

        private void UpdateService(Config config)
        {
            ExecSc($"config {Config.ServiceName} start={(config.Autostart ? "auto" : "demand")} binPath={config.Cmd()}");
        }

        private void RegisterService(Config config)
        {
            ExecSc($"create {Config.ServiceName} start={config.AutostartStr()} binPath={config.Cmd()}");
        }

        private string ServiceCmd()
        {
            var cmdOut = ExecSc($"qc {Config.ServiceName}");
            return cmdOut.Single(l => l.Contains("BINARY_PATH_NAME")).Split(" : ").Last().Trim();
        }

        private IEnumerable<string> ExecSc(string args)
        {
            var procStartInfo = new System.Diagnostics.ProcessStartInfo("sc.exe", args);
            procStartInfo.RedirectStandardOutput = true;
            procStartInfo.UseShellExecute = false;
            procStartInfo.CreateNoWindow = true;
            var proc = new System.Diagnostics.Process();
            proc.StartInfo = procStartInfo;
            proc.Start();
            var cmdOut = proc.StandardOutput.ReadToEnd().Split("\r\n");
            if (proc.ExitCode != 0) throw new Exception(proc.StandardError.ReadToEnd());
            return cmdOut;
        }

        private IEnumerable<IEnumerable<string>> ParseArgs(string cmdLine)
        {
            return cmdLine.Split("--").Skip(1)
                .Select(p =>
                    p.Trim().Split("=").Select(i => i.Trim())
                );
        }

        private void SelectExeFileBtn_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "convertapi-automator.exe|convertapi-automator.exe";
            if (openFileDialog.ShowDialog() == true)
                ExecFileInput.Text = openFileDialog.FileName;
        }

        private void AddDirBtn_Click(object sender, RoutedEventArgs e)
        {
            CommonOpenFileDialog dialog = new CommonOpenFileDialog() { IsFolderPicker = true };
            if (dialog.ShowDialog() == CommonFileDialogResult.Ok)
            {
                DirListBox.Items.Add(dialog.FileName);
            }
        }
    }
}
