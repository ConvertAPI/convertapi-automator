using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using ConvertApiDotNet;

namespace Lib
{
    internal static class Scanner
    {
        private static SemaphoreSlim _concSem = new SemaphoreSlim(2);    // 2 is the best parallel upload performance

        /// <summary>
        /// Creates ConvertApiFileParam from local files (unzips if needed) and removes
        /// </summary>
        /// <param name="files">Files</param>
        /// <returns>Convertapi params</returns>
        public static IEnumerable<ConvertApiFileParam> GetFileParams(IEnumerable<FileInfo> files)
        {
            var filteredFiles = files.Where(f => !string.Equals(f.Name, "config.txt", StringComparison.InvariantCultureIgnoreCase));
            var tmpFiles = MoveFiles(filteredFiles);
            var readyFiles = PrepareFiles(tmpFiles);
            return FilesToParams(readyFiles);
        }

        private static List<FileInfo> MoveFiles(IEnumerable<FileInfo> filteredFiles)
        {
            var tempDir = new DirectoryInfo(Path.GetTempPath());
            if (filteredFiles.Any())
            {
                tempDir = CreateTempDir();
            }

            var tmpFiles = filteredFiles.Select(f =>
            {
                var tmpPath = Path.Combine(tempDir.FullName, f.Name);

                var retryNo = 0;
                while (true)
                {
                    try
                    {
                        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) || RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                        {
                            var output = RunCommand("lsof", $"-t \"{f.FullName}\"");
                            if (output.Contains("No such file")) break;
                            if (output != String.Empty) throw new IOException();
                        }                        
                        f.MoveTo(tmpPath);
                        break;
                    }
                    catch (IOException e)
                    {
                        Console.WriteLine($"Retry move");
                        if (retryNo++ > 100)
                        {
                            Console.Error.WriteLine($"Unable access: {f.FullName}\n{e.Message}");
                            break;
                        }

                        Thread.Sleep(500);
                    }
                }
                return File.Exists(tmpPath) ? new FileInfo(tmpPath) : null; 
            }).ToList();
            tmpFiles.RemoveAll(p => p == null);
            return tmpFiles;
        }

        private static List<FileInfo> PrepareFiles(List<FileInfo> tmpFiles)
        {
            var readyFiles = tmpFiles.SelectMany(f =>
            {
                var result = new List<FileInfo>();
                var ext = f.Extension.Replace(".", "");
                if (ext.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
                {
                    using (var zip = ZipFile.OpenRead(f.FullName))
                    {
                        var zipDir = CreateTempDir();
                        zip.ExtractToDirectory(zipDir.FullName);
                        result.AddRange(zipDir.GetFiles());
                    }
                    f.Directory.Delete(true);
                }
                else
                {
                    result.Add(f);
                }

                return result;
            }).ToList();
            return readyFiles;
        }

        private static List<ConvertApiFileParam> FilesToParams(List<FileInfo> readyFiles)
        {
            return readyFiles.OrderBy(f => f.Length).Select(f =>
            {
                _concSem.Wait();
                var fp = new ConvertApiFileParam(f);

                // Delete uploaded file from local file system
                fp.GetValueAsync().ContinueWith(fm =>
                {
                    _concSem.Release();
                    try
                    {
                        var dir = f.Directory;
                        f.Delete();
                        if (!dir.GetFileSystemInfos().Any()) dir.Delete();
                    }
                    catch (Exception e)
                    {
                        Console.Error.WriteLine(e.Message);
                    }
                });

                return fp;
            }).ToList();
        }

        private static DirectoryInfo CreateTempDir()
        {
            var uniqueTempDir = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "convertapi-automator", Guid.NewGuid().ToString()));
            return Directory.CreateDirectory(uniqueTempDir);
        }
        
        private static string RunCommand(string command, string args)
        {
            var process = new Process()
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };
            process.Start();
            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (string.IsNullOrEmpty(error)) { return output; }
            else { return error; }
        }    
        
    }
}
