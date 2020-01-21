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
            var files = dir.GetFiles()
                .Where(f => !string.Equals(f.Name, "config.txt", StringComparison.InvariantCultureIgnoreCase));

            return files.SelectMany(FileToParam);
        }

        private static IEnumerable<ConvertApiFileParam> FileToParam(FileInfo f)
        {
            var convertApiFileParams = new List<ConvertApiFileParam>();

            var format = Path.GetExtension(f.Name).Replace(".", "");
            if (format.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
            {
                using var zipa = ZipFile.OpenRead(f.FullName);
                convertApiFileParams.AddRange(zipa.Entries.Select(zipArchiveEntry => new ConvertApiFileParam(zipArchiveEntry.Open(), zipArchiveEntry.Name)));
            }
            else
                convertApiFileParams.Add(new ConvertApiFileParam(f));

            return convertApiFileParams;
        }
    }
}
