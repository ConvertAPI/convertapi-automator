using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ConvertApiDotNet;
using ConvertApiDotNet.Exceptions;

namespace Lib
{
    /// <summary>
    /// Conversion queue. Responsible for asynchronous file conversion chain configured by directory structure.
    /// </summary>
    public static class Queue
    {
        private static ConvertApi _convertApi;
        public static CountdownEvent Cde;
        private static SemaphoreSlim _concSem;

        /// <summary>
        /// Create singleton convertapi library instance.
        /// </summary>
        /// <param name="secret">Convertapi secret</param>
        public static void Init(string secret, int maxConc)
        {
            _convertApi = new ConvertApi(secret);
            _concSem = new SemaphoreSlim(maxConc);
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
            _concSem.Wait();
            
            // workaround for any -> zip, otherwise the conversion fails
            if (cfg.DestinationFormat == "zip")
            {
                // change the source format to "any", and if single file is present, change the parameter name from "File" to "Files" (converter expects an array)
                srcFormat = "any";
                var files = convertParams.Where(x => x.Name == "File");
                if (files.Count() == 1)
                {
                    var file = (ConvertApiFileParam)files.First();
                    convertParams[convertParams.IndexOf(file)] = new ConvertApiFileParam("Files", file.GetValueAsync().Result);
                }
            }

            return _convertApi.ConvertAsync(srcFormat, cfg.DestinationFormat, convertParams)
                .ContinueWith(tr =>
                {
                    _concSem.Release();
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
                                            Console.WriteLine($"Result: {tfi.Result.FullName}");
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
                        var exception = tr.Exception?.InnerException as ConvertApiException;
                        Console.Error.WriteLine($"Unable to convert: {fileNamesStr} -> {cfg.DestinationFormat}\n{tr.Exception?.Flatten().Message}\n{exception?.Response}");
                        Cde?.Signal();
                        if (Cde?.CurrentCount == 1) Cde?.Signal();    // Removing initial count to unblock wait
                    }
                });
        }
    }
}