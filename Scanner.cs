using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using ConvertApiDotNet;

namespace convertapi_automator
{
    class Scanner
    {
        public static IEnumerable<ConvertApiFileParam> GetFiles(DirectoryInfo dir)
        {
            var tempDir = CreateTempDir();
            
            var files = dir.GetFiles()
                .Where(f => !string.Equals(f.Name, "config.txt", StringComparison.InvariantCultureIgnoreCase));

            var tmpFiles = files.Select(f =>
            {
                var tmpPath = Path.Combine(tempDir.FullName, f.Name);
                f.MoveTo(tmpPath);
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
