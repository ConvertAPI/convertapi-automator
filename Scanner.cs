using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading;
using ConvertApiDotNet;

namespace convertapi_automator
{
    class Scanner
    {
        public static IEnumerable<ConvertApiFileParam> GetFileParams(IEnumerable<FileInfo> files)
        {
            var tempDir = CreateTempDir();
            
            files = files.Where(f => !string.Equals(f.Name, "config.txt", StringComparison.InvariantCultureIgnoreCase));

            var tmpFiles = files.Select(f =>
            {
                var tmpPath = Path.Combine(tempDir.FullName, f.Name);

                var retryNo = 0;
                while (true)
                {
                    try
                    {
                        f.MoveTo(tmpPath);
                        break;
                    }
                    catch (IOException e)
                    {
                        if (retryNo++ > 100) throw;
                        Thread.Sleep(500);
                    }
                }

                return new FileInfo(tmpPath);
            }).ToList();

            var readyFiles = tmpFiles.SelectMany(f =>
            {
                var result = new List<FileInfo>();
                var ext = f.Extension.Replace(".", "");
                if (ext.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
                {
                    var zip = ZipFile.OpenRead(f.FullName);
                    var zipDir = CreateTempDir();
                    zip.ExtractToDirectory(zipDir.FullName);
                    result.AddRange(zipDir.GetFiles());
                }
                else
                {
                    result.Add(f);
                }

                return result;
            });
            

            return readyFiles.Select(f => new ConvertApiFileParam(f));
        }

        private static DirectoryInfo CreateTempDir()
        {
            var uniqueTempDir = Path.GetFullPath(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString()));
            return Directory.CreateDirectory(uniqueTempDir);
        }
    }
}
