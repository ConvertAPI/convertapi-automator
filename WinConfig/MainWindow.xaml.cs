using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using Microsoft.WindowsAPICodePack.Dialogs;
using System.Text.RegularExpressions;
using System.Windows.Input;
using System.Threading;

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
                var cmd = ParseArgs(Sc.ServiceCmd());
                config = new Config(cmd.exec, cmd.args);
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

            config.Active = Sc.Running();
            ConfigToControls(config);
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

        private Config ControlsToConfig()
        {
            var config = new Config();

            if (File.Exists(ExecFileInput.Text))
            {
                config.ExeFile = new FileInfo(ExecFileInput.Text);
            }

            config.Secret = SecretInput.Text;
            config.Dirs = DirListBox.Items.Cast<string>()
                .Where(i => Directory.Exists(i))
                .Select(i => new DirectoryInfo(i)).ToList();

            config.Concurrency = MaxConcSpin.Value.GetValueOrDefault();
            config.Level = LevelSpin.Value.GetValueOrDefault();
            config.Autostart = AutostartCheckBox.IsChecked.GetValueOrDefault();
            config.Active = ActiveCheckBox.IsChecked.GetValueOrDefault();

            return config;
        }

        private void RemoveDirBtn_Click(object sender, RoutedEventArgs e)
        {
            DirListBox.Items.Remove(DirListBox.SelectedItem);
        }

        private void ApplyBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var config = ControlsToConfig();
                if (Sc.Installed())
                {
                    if (Sc.Running())
                    {
                        Sc.Stop();
                    }
                    Sc.UpdateService(config);
                }
                else
                {
                    Sc.Install(config);
                }

                if (config.Active)
                {

                    try
                    {
                        Thread.Sleep(1000);
                        Sc.Start();
                    }
                    catch
                    {
                        Thread.Sleep(2000);
                        Sc.Start();
                    }
                }

                MessageBox.Show("Service successfully updated.", "Convertapi Automator", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception err)
            {
                MessageBox.Show(err.Message, "Convertapi Automator", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public static (string exec, IEnumerable<IEnumerable<string>> args) ParseArgs(string cmdLine)
        {
            var arr = cmdLine.Split("--");
            var args = cmdLine.Split("--").Skip(1)
                .Select(p =>
                    p.Trim().Split("=").Select(i => i.Trim())
                );

            return (arr.First(), args);
        }

    }

}
