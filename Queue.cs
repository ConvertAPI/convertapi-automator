using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ConvertApiDotNet;

namespace convertapi_automator
{
    /// <summary>
    /// Conversion queue. Responsible for asynchronous file conversion chain configured by directory structure.
    /// </summary>
    internal static class Queue
    {
        private static ConvertApi _convertApi;

        /// <summary>
        /// Create singleton convertapi library instance.
        /// </summary>
        /// <param name="secret">Convertapi secret</param>
        public static void Init(string secret)
        {
            _convertApi = new ConvertApi(secret);
        }

        /// <summary>
        /// Start converting file in conversion chain
        /// </summary>
        /// <param name="file">File that should be converter</param>
        /// <param name="inQueue">Parent (incoming) file queue</param>
        public static void ConvertFile(FileInfo file, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            var cfg = Config.GetConvConfig(file.Directory);
            var outQueues = OutQueues(file.Directory);
            PrepareQueues(Scanner.GetFileParams(new List<FileInfo> { file }), cfg, outQueues, inQueue);
        }

        /// <summary>
        /// Start converting all files located in directory
        /// </summary>
        /// <param name="dir">Directory with files that will be converted</param>
        /// <param name="inQueue">Parent (incoming) file queue</param>
        public static void ConvertDir(DirectoryInfo dir, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            var outQueues = OutQueues(dir);
            var cfg = Config.GetConvConfig(dir);
            if (outQueues.Any())
            {
                PrepareQueues(Scanner.GetFileParams(dir.GetFiles()), cfg, outQueues, inQueue);
            }
            else
            {
                PrepareQueues(new List<ConvertApiFileParam>(), cfg, outQueues, inQueue);
            }
        }

        private static void PrepareQueues(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues, BlockingCollection<ConvertApiFileParam> inQueue = null)
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
                        Convert(preQueue.GetConsumingEnumerable().ToList(), cfg, outQueues).Wait();
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

        private static Task Convert(List<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues)
        {
            var fileNamesStr = string.Join(", ", fileParams.Select(f => f.GetValueAsync().Result.FileName));
//            Console.WriteLine($"Converting: {fileNamesStr} -> {cfg.DestinationFormat}");
            var orderedFileParams = fileParams.OrderBy(fp => fp.GetValueAsync().Result.FileName).ToList();
            var srcFormat = orderedFileParams.First().GetValueAsync().Result.FileExt;
            var convertParams = orderedFileParams.Cast<ConvertApiBaseParam>().Concat(cfg.Params).ToList();

            return _convertApi.ConvertAsync(srcFormat, cfg.DestinationFormat, convertParams)
                .ContinueWith(r =>
                {
                    try
                    {
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
                            r.Result.Files.ToList().ForEach(f => Console.WriteLine(Path.Join(cfg.Directory.FullName, f.FileName)));
                        }
                    }
                    catch (Exception e)
                    {
                        Console.Error.WriteLine($"Unable to convert: {fileNamesStr} -> {cfg.DestinationFormat}\n{e.Message}");
                    }
                });
        }
    }
        
}