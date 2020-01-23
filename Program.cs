using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
        /// <param name="dir">File input directory</param>
        /// <param name="watch">Watch input directory for new files and automatically convert them</param>
        static int Main(string secret, string dir, bool watch = false)
        {
            var exitCode = 0;
            if (string.IsNullOrEmpty(secret))
            {
                Console.Error.WriteLine("No secret provided. Please set --secret option. Sign in and get your secret at https://www.convertapi.com");
                exitCode = 1;
            }
            if (string.IsNullOrEmpty(dir))
            {
                Console.Error.WriteLine("No input directory provided. Please set --dir option to a path of your input directory.");
                exitCode = 1;
            }
            else if (!Directory.Exists(dir))
            {
                Console.Error.WriteLine("Input directory does not exist. Please set valid path to --dir option.");
                exitCode = 1;
            }

            if (exitCode == 0)
            {
                Queue.Init(secret);
                var dirInfo = new DirectoryInfo(dir);
            
                if (watch)
                {
                    DirWatcher.Start(dirInfo);
                }
                else
                {
                    Queue.ConvertDir(dirInfo);                
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
