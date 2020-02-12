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
        private DirWatcher _dirWatcher;

        public Worker(List<DirectoryInfo> dirInfos, int level)
        {
            _dirWatcher = new DirWatcher(dirInfos, level);
        }

        protected override Task ExecuteAsync(CancellationToken serviceCt)
        {
            return _dirWatcher.Start(serviceCt);
        }

    }
}
