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
        /// convertapi-automator provides easy way to convert your files to various formats.
        /// Supported conversion types available available at: https://www.convertapi.com/doc/supported-formats
        ///
        /// convertapi-automator converts files located in conversion directory (set by --dir option).
        /// Conversion destination format(s) are set by creating subdirectories inside conversion directory. 
        /// 
        /// </summary>
        /// <param name="secret">Your convertapi.com secret.</param>
        /// <param name="dir">Conversion directory</param>
        /// <param name="watch">Watch conversion directory for new files and automatically convert</param>
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
                Console.Error.WriteLine("No conversion directory provided. Please set --dir option to a path of your conversion directory.");
                exitCode = 1;
            }
            else if (!Directory.Exists(dir))
            {
                Console.Error.WriteLine("Conversion directory does not exist. Please set valid path to --dir option.");
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
