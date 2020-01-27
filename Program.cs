using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using ConvertApiDotNet;

namespace convertapi_automator
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
        /// IMPORTANT: all files that are placed inside input directory will be deleted.
        /// </para>
        /// 
        /// </summary>
        /// <param name="secret">Your convertapi.com secret.</param>
        /// <param name="dir">File input directory(ies) </param>
        /// <param name="watch">Watch input directory for new files and automatically convert them</param>
        static int Main(string secret, List<string> dir, bool watch = false)
        {
            Console.WriteLine($"convertapi-automator {Assembly.GetEntryAssembly().GetName().Version}");
            var exitCode = 0;
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
                Queue.Init(secret);
                var dirInfos = dir.Select(d => new DirectoryInfo(d)).ToList();
                if (watch)
                {
                    var cts = new CancellationTokenSource();
                    Console.CancelKeyPress += (s, a) => cts.Cancel();

                    var tasks = dirInfos.Select(d => DirWatcher.Start(d, cts.Token));
                    Task.WaitAll(tasks.ToArray());
                }
                else
                {
                    Queue.Cde = new CountdownEvent(1);
                    var sourceFileCount = dirInfos.Sum(d => Queue.ConvertDir(d));
                    if (sourceFileCount > 0) Queue.Cde.Wait();  // If no source files provided exiting
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
