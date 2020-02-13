using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using Cli;
using Lib;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace cli
{
    class Program
    {
        /// <summary>
        /// <para>
        /// convertapi-automator provides easy way to convert your files to various formats.
        /// Supported conversion types available available at https://www.convertapi.com/doc/supported-formats .
        /// </para>
        ///
        /// <para>
        /// convertapi-automator converts files located inside input directory (set by --dir option).
        /// Conversion destination format(s) are set by creating subdirectories inside input directory named by format.
        /// For example conv-dir/jpg all files placed inside conv-dir will be converted to jpg format and saved inside jpg directory.
        /// Application can run in "watch" mode that will constantly monitor input directory for new files and convert them.
        /// For more usage examples please visit https://github.com/ConvertAPI/convertapi-automator .
        /// IMPORTANT: all files that are placed inside input directory will be DELETED during conversion.
        /// </para>
        /// 
        /// </summary>
        /// <param name="secret">Your convertapi.com secret. Alternatively can be set to CONVERTAPI_SECRET environment variable.</param>
        /// <param name="dir">File input directory(ies)</param>
        /// <param name="level">File input directory depth level. Default: 0 (supplied directory is an input directory)</param>
        /// <param name="watch">Watch input directory for new files and automatically convert them</param>
        /// <param name="concurrency">File conversion maximum concurrency. Default 10</param>
        static int Main(string secret, List<string> dir, int level, bool watch = false, int concurrency=10)
        {
            Console.WriteLine($"convertapi-automator {Assembly.GetEntryAssembly().GetName().Version}");
            var exitCode = 0;

            secret ??= Environment.GetEnvironmentVariable("CONVERTAPI_SECRET");
            if (string.IsNullOrEmpty(secret))
            {
                Console.Error.WriteLine("No secret provided. Please set --secret option. Sign in and get your secret at https://www.convertapi.com");
                exitCode = 1;
            }
            if (dir.Any())
            {
                dir.FindAll(d => !Directory.Exists(d)).ForEach(d =>
                {
                    Console.Error.WriteLine($"Input directory {d} does not exist. Please set valid path to --dir option.");
                    exitCode = 1;
                });
            }
            else
            {
                Console.Error.WriteLine("No input directory provided. Please set --dir option to a path of your input directory.");
                exitCode = 1;
            }

            if (exitCode == 0)
            {
                Lib.Queue.Init(secret, concurrency);
                
                var dirInfos = dir.Select(d => new DirectoryInfo(d)).ToList();
                
                if (watch)
                {
                    Host.CreateDefaultBuilder()
                        .ConfigureServices((hostContext, services) =>
                        {
                            services.AddHostedService<Worker>(p => new Worker(dirInfos, level));
                        }).UseWindowsService().Build().Run();
                }
                else
                {
                    Lib.Queue.Cde = new CountdownEvent(1);
                    var inputDirs = dirInfos.SelectMany(d => DirWatcher.SubDirsByLevel(d, level));
                    var sourceFileCount = inputDirs.Sum(d => Queue.ConvertDir(d));
                    if (sourceFileCount > 0) Lib.Queue.Cde.Wait();  // If no source files provided exiting
                }
            }
            else
            {
                Console.Error.WriteLine("Use --help for detail information.");
            }

            return exitCode;
        }

    }
}