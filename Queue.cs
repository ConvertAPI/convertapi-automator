using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ConvertApiDotNet;
using ConvertApiDotNet.Exceptions;

namespace convertapi_automator
{
    /// <summary>
    /// Conversion queue. Responsible for asynchronous file conversion chain configured by directory structure.
    /// </summary>
    internal static class Queue
    {
        private static ConvertApi _convertApi;
        public static CountdownEvent Cde;

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
        public static int ConvertDir(DirectoryInfo dir, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            var outQueues = OutQueues(dir);
            var cfg = Config.GetConvConfig(dir);
            var dirFileCnt = 0;
            if (outQueues.Any())
            {
                var fileParams = Scanner.GetFileParams(dir.GetFiles());
                PrepareQueues(fileParams, cfg, outQueues, inQueue);
                dirFileCnt = fileParams.Count();
            }
            else
            {
                PrepareQueues(new List<ConvertApiFileParam>(), cfg, outQueues, inQueue);
            }

            return dirFileCnt;
        }

        private static List<BlockingCollection<ConvertApiFileParam>> OutQueues(DirectoryInfo dir)
        {
            return  dir.GetDirectories().Select(d =>
            {
                var queue = new BlockingCollection<ConvertApiFileParam>();
                Task.Factory.StartNew(() => ConvertDir(d, queue), TaskCreationOptions.LongRunning);
                return queue;
            }).ToList();
        }

        private static void PrepareQueues(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues, BlockingCollection<ConvertApiFileParam> inQueue = null)
        {
            if (fileParams.Any() || inQueue != null)
            {
                var bufQueue = new BlockingCollection<ConvertApiFileParam>();

                // Add local files
                if (outQueues.Any() && !cfg.SaveIntermediate)
                {
                    fileParams.ToList().ForEach(bufQueue.Add);
                }

                var skipConversion = inQueue == null || inQueue.IsCompleted;

                // Add chaining result files
                if (skipConversion)
                {
                    bufQueue.CompleteAdding();
                }
                else
                {
                    Task.Factory.StartNew(() =>
                    {
                        foreach (var fp in inQueue.GetConsumingEnumerable())
                        {
                            bufQueue.Add(fp);
                        }
                        bufQueue.CompleteAdding();
                    }, TaskCreationOptions.LongRunning);
                }

                if (skipConversion)
                {
                    bufQueue.GetConsumingEnumerable().ToList().ForEach(fp => outQueues.ForEach(q => q.Add(fp)));
                }
                else
                {
                    if (cfg.JoinFiles)
                    {
                        Convert(bufQueue.GetConsumingEnumerable().ToList(), cfg, outQueues).Wait();
                    }
                    else
                    {
                        var convertTasks = new List<Task>();
                        foreach (var fp in bufQueue.GetConsumingEnumerable())
                        {
                            var convertTask = Convert(new List<ConvertApiFileParam> {fp}, cfg, outQueues);
                            convertTasks.Add(convertTask);
                        }
                        Task.WaitAll(convertTasks.ToArray());
                    }
                }

                outQueues.ForEach(q => q.CompleteAdding());
            }
        }

        private static Task Convert(List<ConvertApiFileParam> fileParams, ConvConfig cfg, List<BlockingCollection<ConvertApiFileParam>> outQueues)
        {
            var fileNamesStr = string.Join(", ", fileParams.Select(f => f.GetValueAsync().Result.FileName).ToList());
            // Console.WriteLine($"Converting: {fileNamesStr} -> {cfg.DestinationFormat}");
            var orderedFileParams = fileParams.OrderBy(fp => fp.GetValueAsync().Result.FileName).ToList();
            var srcFormat = orderedFileParams.First().GetValueAsync().Result.FileExt;
            var convertParams = orderedFileParams.Cast<ConvertApiBaseParam>().Concat(cfg.Params).ToList();

            Cde?.AddCount();
            return _convertApi.ConvertAsync(srcFormat, cfg.DestinationFormat, convertParams)
                .ContinueWith(tr =>
                {
                    if (tr.IsCompletedSuccessfully)
                    {
                        try
                        {
                            tr.Result.Files.ToList().ForEach(resFile =>
                            {
                                if (outQueues.Any())
                                {
                                    var fp = new ConvertApiFileParam(resFile.Url);
                                    outQueues.ForEach(action: q => q.Add(fp));
                                    Cde?.Signal();
                                }

                                if (!outQueues.Any() || cfg.SaveIntermediate)
                                {
                                    resFile.SaveFileAsync(Path.Join(cfg.Directory.FullName, resFile.FileName))
                                        .ContinueWith(tfi =>
                                        {
                                            Console.WriteLine(tfi.Result.FullName);
                                            Cde?.Signal();
                                            if (Cde?.CurrentCount == 1) Cde?.Signal();    // Removing initial count to unblock wait
                                        });
                                }
                            });
                        }
                        catch (ConvertApiException e)
                        {
                            Console.Error.WriteLine($"Unable to convert: {fileNamesStr} -> {cfg.DestinationFormat}\n{e.Message}\n{e.Response}");
                        }
                        catch (Exception e)
                        {
                            Console.Error.WriteLine($"Unable to convert: {fileNamesStr} -> {cfg.DestinationFormat}\n{e.Message}");
                        }
                    }
                    else
                    {
                        Console.Error.WriteLine($"Unable to convert: {fileNamesStr} -> {cfg.DestinationFormat}\n{tr.Exception?.Flatten().Message}");
                        Cde?.Signal();
                        if (Cde?.CurrentCount == 1) Cde?.Signal();    // Removing initial count to unblock wait
                    }
                });
        }
    }
}