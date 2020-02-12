using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Lib
{
    public class DirWatcher
    {
        private readonly List<DirectoryInfo> _dirs;
        private readonly int _level;
        private CancellationTokenSource _reloadCts  = new CancellationTokenSource();
        private Mutex reloadMux = new Mutex();

        public DirWatcher(List<DirectoryInfo> dirs, int level)
        {
            _dirs = dirs;
            _level = level;
        }

        public Task Start(CancellationToken serviceCt)
        {
            serviceCt.Register(() => _reloadCts.Cancel());    // Needs to be cancelled to exit WatchTree
            var watchCts = CancellationTokenSource.CreateLinkedTokenSource(serviceCt, _reloadCts.Token);

            var treeTasks = _dirs.Select(WatchTree);
            
            var inputDirs = _dirs.SelectMany(d => SubDirsByLevel(d, _level)); 
            var inputTasks = inputDirs.Select(d => WatchInput(d, watchCts.Token));

            var tasks = treeTasks.Concat(inputTasks);

            return Task.WhenAll(tasks.ToArray()).ContinueWith(t =>
            {
                return serviceCt.IsCancellationRequested
                    ? Task.CompletedTask
                    : Start(serviceCt);
            }, serviceCt);
        }

        public static List<DirectoryInfo> SubDirsByLevel(DirectoryInfo dir, int level)
        {
            return level > 0 
                ? dir.GetDirectories().SelectMany(d => SubDirsByLevel(d, --level)).ToList() 
                : new List<DirectoryInfo> {dir};
        }
        
        private static Task WatchInput(DirectoryInfo dir, CancellationToken ct)
        {
            return Task.Factory.StartNew(() =>
            {
                Queue.ConvertDir(dir); // Converting preexisting files
                using var watcher = new FileSystemWatcher(dir.FullName) {NotifyFilter = NotifyFilters.FileName};
                watcher.Created += (s, a) => Queue.ConvertFile(new FileInfo(a.FullPath));
                watcher.EnableRaisingEvents = true;
                ct.WaitHandle.WaitOne();
            }, TaskCreationOptions.LongRunning);
        }

        private Task WatchTree(DirectoryInfo dir)
        {
            return Task.Factory.StartNew(() =>
            {
                Queue.ConvertDir(dir); // Converting preexisting files
                using var watcher = new FileSystemWatcher(dir.FullName)
                {
                    NotifyFilter = NotifyFilters.DirectoryName,
                    IncludeSubdirectories = true
                };
                watcher.Created += (s, a) => Reload();
                watcher.EnableRaisingEvents = true;
                _reloadCts.Token.WaitHandle.WaitOne();
            }, TaskCreationOptions.LongRunning);
        }
        
        public void Reload()
        {
            Console.WriteLine("RELOAD!!!");
            try
            {
                reloadMux.WaitOne();
                
                var oldReloadCts = _reloadCts;
                _reloadCts  = new CancellationTokenSource();
                oldReloadCts.Cancel();
            }
            finally
            {
                reloadMux.ReleaseMutex();
            }
        }
        
    }
}