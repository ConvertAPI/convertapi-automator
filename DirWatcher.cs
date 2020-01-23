using System;
using System.IO;
using System.Threading;

namespace convertapi_automator
{
    internal static class DirWatcher
    {
        private static readonly ManualResetEventSlim Mres = new ManualResetEventSlim(false);

        public static void Start(DirectoryInfo dir)
        {
            var cts = new CancellationTokenSource();
            Console.CancelKeyPress += (s, a) => cts.Cancel();
            
            Queue.ConvertDir(dir);    // Converting preexisting files
            using var watcher = new FileSystemWatcher(dir.FullName);
            watcher.Created += (s, a) => Queue.ConvertFile(new FileInfo(a.FullPath));
            watcher.EnableRaisingEvents = true;
            Mres.Wait(cts.Token);
        }
    }
}