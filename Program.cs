using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ConvertApiDotNet;
// using System.CommandLine.DragonFruit;

namespace convertapi_automator
{
    class Program
    {
        private static ConvertApi _convertApi;


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
            ConvertDir(dir);
            Console.Read();
        }

        static void ConvertDir(DirectoryInfo dir, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            var outQueues = dir.GetDirectories().Select(d =>
            {
                var queue = new BlockingCollection<ConvertApiFileParam>();
                Task.Factory.StartNew(() => ConvertDir(d, queue), TaskCreationOptions.LongRunning);
                return queue;
            }).ToList();

            var cfg = Config.GetConvConfig(dir);
            var localFiles = Scanner.GetFiles(dir);

            var preQueue = new BlockingCollection<ConvertApiFileParam>();

            // Add local files
            if (outQueues.Any())
            {
                localFiles.ToList().ForEach(preQueue.Add);
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
                        .Select(fp => Convert(new List<ConvertApiFileParam> {fp}, cfg, outQueues));
                    Task.WaitAll(convertTasks.ToArray());
                }
            }

            outQueues.ForEach(q => q.CompleteAdding());
        }

        private static Task Convert(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues)
        {
            var orderedFileParams = fileParams.OrderBy(fp => fp.GetValueAsync().Result.FileName).ToList();
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
                        r.Result.Files.ToList().ForEach(f =>
                        {
                            var fp = new ConvertApiFileParam(f.Url);
                            outQueues.ForEach(q => q.Add(fp));
                        });
                    }
                    else
                    {
                        r.Result.SaveFilesAsync(cfg.Directory.FullName).Wait();
                    }
                });
        }
    }
}
