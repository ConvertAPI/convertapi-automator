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
    private readonly List<DirectoryInfo> _dirInfos;

    public Worker(List<DirectoryInfo> dirInfos)
    {
        _dirInfos = dirInfos;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var tasks = _dirInfos.Select(d => DirWatcher.Start(d, stoppingToken));
        return Task.WhenAll(tasks.ToArray());
    }
}
}
