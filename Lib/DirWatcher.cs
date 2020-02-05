using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Lib
{
    public static class DirWatcher
    {
        public static Task Start(DirectoryInfo dir, CancellationToken ct)
        {
            return Task.Factory.StartNew(() =>
            {
                Queue.ConvertDir(dir); // Converting preexisting files
                using var watcher = new FileSystemWatcher(dir.FullName);
                watcher.Created += (s, a) => Queue.ConvertFile(new FileInfo(a.FullPath));
                watcher.EnableRaisingEvents = true;
                ct.WaitHandle.WaitOne();
            }, TaskCreationOptions.LongRunning);
        }
    }
}