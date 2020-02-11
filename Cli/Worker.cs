using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lib;
using Microsoft.Extensions.Hosting;

namespace Cli
{
    public class Worker : BackgroundService
    {
        private List<DirectoryInfo> _dirInfos;
        private CancellationTokenSource _reloadCts  = new CancellationTokenSource();
        private Mutex reloadMux = new Mutex();

        public Worker(List<DirectoryInfo> dirInfos)
        {
            _dirInfos = dirInfos;
        }

        public void Reload(List<DirectoryInfo> dirInfos)
        {
            try
            {
                reloadMux.WaitOne();
                
                var oldReloadCts = _reloadCts;
                _reloadCts  = new CancellationTokenSource();
                _dirInfos = dirInfos;
                oldReloadCts.Cancel();
            }
            finally
            {
                reloadMux.ReleaseMutex();
            }
        }

        protected override Task ExecuteAsync(CancellationToken serviceCt)
        {
            return WatchDirs(serviceCt);
        }

        private Task WatchDirs(CancellationToken serviceCt)
        {
            var watchCts = CancellationTokenSource.CreateLinkedTokenSource(serviceCt, _reloadCts.Token);
            var tasks = _dirInfos.Select(d => DirWatcher.Start(d, watchCts.Token));
            return Task.WhenAll(tasks.ToArray()).ContinueWith(t =>
            {
                return serviceCt.IsCancellationRequested
                    ? Task.CompletedTask
                    : WatchDirs(serviceCt);
            }, serviceCt);
        }
    }
}
