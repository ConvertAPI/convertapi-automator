using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ConvertApiDotNet;

namespace convertapi_automator
{
    class Program
    {
        private static ConvertApi convertApi = new ConvertApi("1234567890123456");

        static void Main(string[] args)
        {
            var dir = new DirectoryInfo(@"c:\Projects\_temp");
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
            localFiles.ToList().ForEach(preQueue.Add);
            var srcFormat = "";
            if (localFiles.Any()) srcFormat = localFiles.First().GetValueAsync().Result.FileExt;

            var skipConversion = inQueue == null;
            // Add chaining result files
            if (skipConversion || inQueue.IsCompleted)
            {
                preQueue.CompleteAdding();
            }
            else
            {
                Task.Factory.StartNew(() =>
                {
                    foreach (var fileParam in inQueue.GetConsumingEnumerable())
                    {
                        srcFormat = fileParam.GetValueAsync().Result.FileExt;
                        preQueue.Add(fileParam);
                    }
                    preQueue.CompleteAdding();
                }, TaskCreationOptions.LongRunning);
            }

            if (skipConversion)
            {
                foreach (var fileParam in preQueue.GetConsumingEnumerable())
                {
                    outQueues.ForEach(q => q.Add(fileParam));
                }
            }
            else
            {
                if (cfg.JoinFiles)
                {
                    Convert(preQueue.ToList(), cfg, srcFormat, outQueues);
                }
                else
                {
                    foreach (var fileParam in preQueue.GetConsumingEnumerable())
                    {
                        Convert(new List<ConvertApiFileParam> { fileParam }, cfg, srcFormat, outQueues);
                    }
                }
            }

            outQueues.ForEach(q => q.CompleteAdding());










            //
            //
            //
            //
            //
            //
            //
            //
            //
            // Scanner.GetJobs(dir).ToList().ForEach(j =>
            // {
            //     if (!j.FileParams.Any()) return;
            //
            //     if (j.Cofig.JoinFiles)
            //     {
            //         var convertParams = new List<ConvertApiBaseParam>();
            //         convertParams.AddRange(j.Cofig.Params);
            //         convertParams.AddRange(j.FileParams);
            //
            //         convertApi.ConvertAsync(j.SourceFormat, j.Cofig.DestinationFormat, convertParams)
            //             .ContinueWith(r =>
            //             {
            //                 if (j.Cofig.ResultDir.GetDirectories().Any())
            //                 {
            //                     var ff = new ConvertApiFileParam("");
            //                     ConvertDir(j.Cofig.ResultDir, r.Result);
            //                 }
            //                 else
            //                 {
            //                     r.Result.SaveFilesAsync(j.Cofig.ResultDir.FullName).Wait();
            //                 }
            //             });
            //     }
            //     else
            //     {
            //         
            //         var conversions = j.FileParams.Select(p =>
            //         {
            //             var convertParams = new List<ConvertApiBaseParam>();
            //             convertParams.AddRange(j.Cofig.Params);
            //             convertParams.Add(p);
            //             
            //             return convertApi.ConvertAsync(j.SourceFormat, j.Cofig.DestinationFormat, convertParams)
            //                 .ContinueWith(r =>
            //                 {
            //                     if (!j.Cofig.ResultDir.GetDirectories().Any())
            //                         r.Result.SaveFilesAsync(j.Cofig.ResultDir.FullName).Wait();
            //                 });
            //         });
            //
            //
            //     }
            // });
        }

        private static void Convert(IEnumerable<ConvertApiFileParam> fileParams, ConvConfig cfg, string srcFormat, List<BlockingCollection<ConvertApiFileParam>> outQueues)
        {
            var convertParams = fileParams.Cast<ConvertApiBaseParam>().Concat(cfg.Params.Cast<ConvertApiBaseParam>());
            convertApi.ConvertAsync(srcFormat, cfg.DestinationFormat, convertParams)
                .ContinueWith(r =>
                {
                    r.Result.Files.ToList().ForEach(f =>
                    {
                        var fp = new ConvertApiFileParam(f.Url);
                        outQueues.ForEach(q => q.Add(fp));
                    });
                });
        }
    }
}
