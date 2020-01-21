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
            var format = Path.GetExtension(f.Name).Replace(".", "");
            if (format.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
            {
                using var zip = ZipFile.OpenRead(f.FullName);
                // return zip.Entries.Select(f => new ConvertApiFileParam(f.Open(), f.Name));

                var zs = zip.Entries.Select(f => (f.Open(), f.Name));

                var fp = zs.Select(f => new ConvertApiFileParam(f.Item1, f.Name));

                return new List<ConvertApiFileParam>();
                // return fp;
            }

            return new List<ConvertApiFileParam> { new ConvertApiFileParam(f) };
        }
    }
}
