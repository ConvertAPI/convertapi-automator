using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ConvertApiDotNet;
// using System.CommandLine.DragonFruit;

namespace convertapi_automator
{
    class Program
    {
        private static ConvertApi _convertApi;
        static readonly ManualResetEventSlim mres = new ManualResetEventSlim(false);

        // /// <summary>
        // /// Convertapi.com automator.
        // /// </summary>
        // /// <param name="secret">Your convertapi.com secret.</param>
        // /// <param name="dir">Conversion directory</param>
        // static void Main(string secret, DirectoryInfo dir)
        // {
        //     // var dir = new DirectoryInfo(@"c:\Projects\_temp");
        //     _convertApi = new ConvertApi(secret);
        //     ConvertDir(dir);
        //     Console.Read();
        // }

        static void Main(string[] args)
        {
            _convertApi = new ConvertApi(args[0]);
            var dir = new DirectoryInfo(args[1]);

            var cts = new CancellationTokenSource();

            Console.CancelKeyPress += (s, a) =>
            {
                cts.Cancel();
            };

            Watcher(dir, cts.Token);
            Console.Read();
        }

        static public void Watcher(DirectoryInfo dir, CancellationToken ct)
        {
            ConvertDir(dir);
            using var watcher = new FileSystemWatcher(dir.FullName);
            watcher.Created += (s, a) => ConvertFile(new FileInfo(a.FullPath));
            watcher.EnableRaisingEvents = true;
            mres.Wait(ct);
        }

        static void ConvertFile(FileInfo file, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            Console.WriteLine($"Found: {file.Name}");
            var cfg = Config.GetConvConfig(file.Directory);
            var outQueues = OutQueues(file.Directory);
            Convert(Scanner.GetFileParams(new List<FileInfo> { file }), cfg, outQueues, inQueue);
        }

        static void ConvertDir(DirectoryInfo dir, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            var outQueues = OutQueues(dir);
            var cfg = Config.GetConvConfig(dir);
            Convert(Scanner.GetFileParams(dir.GetFiles()), cfg, outQueues, inQueue);
        }

        private static void Convert(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            if (fileParams.Any() || inQueue != null)
            {
                var preQueue = new BlockingCollection<ConvertApiFileParam>();

                // Add local files
                if (outQueues.Any())
                {
                    fileParams.ToList().ForEach(preQueue.Add);
                }

                var skipConversion = inQueue == null || inQueue.IsCompleted;

                // Add chaining result files
                if (skipConversion)
                {
                    preQueue.CompleteAdding();
                }
                else
                {
                    Task.Factory.StartNew(() =>
                    {
                        inQueue.GetConsumingEnumerable().ToList().ForEach(preQueue.Add);
                        preQueue.CompleteAdding();
                    }, TaskCreationOptions.LongRunning);
                }

                if (skipConversion)
                {
                    preQueue.GetConsumingEnumerable().ToList().ForEach(fp => outQueues.ForEach(q => q.Add(fp)));
                }
                else
                {
                    if (cfg.JoinFiles)
                    {
                        Convert(preQueue.GetConsumingEnumerable(), cfg, outQueues).Wait();
                    }
                    else
                    {
                        var convertTasks = preQueue.GetConsumingEnumerable()
                            .Select(fp => Convert(new List<ConvertApiFileParam> { fp }, cfg, outQueues));
                        Task.WaitAll(convertTasks.ToArray());
                    }
                }

                outQueues.ForEach(q => q.CompleteAdding());
            }
        }

        private static List<BlockingCollection<ConvertApiFileParam>> OutQueues(DirectoryInfo dir)
        {
            return dir.GetDirectories().Select(d =>
            {
                var queue = new BlockingCollection<ConvertApiFileParam>();
                Task.Factory.StartNew(() => ConvertDir(d, queue), TaskCreationOptions.LongRunning);
                return queue;
            }).ToList();
        }

        private static Task Convert(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues)
        {
            Console.WriteLine($"fp: {fileParams.Count()}");
            Console.WriteLine($"fp: {fileParams.First().GetValueAsync().Result.FileName}");

            // Console.WriteLine($"Converting: {string.Join(", ", fileParams.Select(f => f.GetValueAsync().Result.FileName))} -> {cfg.DestinationFormat}");
            var orderedFileParams = fileParams.OrderBy(fp => fp.GetValueAsync().Result.FileName).ToList();
            // Console.WriteLine($"fpo: {orderedFileParams.Count()}");
            var srcFormat = orderedFileParams.First().GetValueAsync().Result.FileExt;
            var convertParams = orderedFileParams.Cast<ConvertApiBaseParam>().Concat(cfg.Params).ToList();
            if (!convertParams.Any())
            {
                Console.WriteLine("No params");
            }
            return _convertApi.ConvertAsync(srcFormat, cfg.DestinationFormat, convertParams)
                .ContinueWith(r =>
                {
                    Console.WriteLine($"{srcFormat} -> {cfg.DestinationFormat}");
                    if (outQueues.Any())
                    {
                        try
                        {
                            r.Result.Files.ToList().ForEach(f =>
                            {
                                var fp = new ConvertApiFileParam(f.Url);
                                outQueues.ForEach(q => q.Add(fp));
                            });
                        }
                        catch (Exception e)
                        {
                            Console.Error.WriteLine(e.Message);
                        }
                    }
                    else
                    {
                        r.Result.SaveFilesAsync(cfg.Directory.FullName).Wait();
                    }
                });
        }
    }
}
