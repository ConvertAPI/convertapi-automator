using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using Microsoft.WindowsAPICodePack.Dialogs;
using System.Text.RegularExpressions;
using System.Windows.Input;

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

            Config config;
            try
            {
                config = new Config(ParseArgs(ServiceCmd()));
            }
            catch
            {
                config = new Config();
                var dirPath = Directory.GetCurrentDirectory();
                var exePath = Path.Combine(dirPath, "convertapi-automator.exe");
                if (File.Exists(exePath))
                {
                    config.ExeFile = new FileInfo(exePath);
                }
            }

            config.Active = ServiceRunning();
            ConfigToControls(config);
        }

        private bool ServiceRunning()
        {
            var result = false;
            try
            {
                var cmdOut = ExecSc($"query {Config.ServiceName}");
                result = cmdOut.Single(l => l.Contains("STATE")).Split(" : ").Contains("RUNNING");
            } catch {}
            return result;
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
            var cmdOut = proc.StandardOutput.ReadToEnd();
            if (proc.ExitCode != 0) throw new Exception(cmdOut);
            return cmdOut.Split("\r\n");
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
                if (DirListBox.Items.IndexOf(dialog.FileName) == -1)
                {
                    DirListBox.Items.Add(dialog.FileName);
                }
            }
        }

        private void NumberValidationTextBox(object sender, TextCompositionEventArgs e)
        {
            Regex regex = new Regex("[^0-9]+");
            e.Handled = regex.IsMatch(e.Text);
        }
        private void ConfigToControls(Config config)
        {
            ExecFileInput.Text = config.ExeFile?.FullName ?? String.Empty;
            SecretInput.Text = config.Secret;
            config.Dirs.ForEach(d => DirListBox.Items.Add(d.FullName));
            MaxConcSpin.Value = config.Concurrency;
            LevelSpin.Value = config.Level;
            AutostartCheckBox.IsChecked = config.Autostart;
            ActiveCheckBox.IsChecked = config.Active;
        }

        private void RemoveDirBtn_Click(object sender, RoutedEventArgs e)
        {
            DirListBox.Items.Remove(DirListBox.SelectedItem);
        }
    }

}
