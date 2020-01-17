using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using ConvertApiDotNet;
using ConvertApiDotNet.Model;

namespace convertapi_automator
{
    // class Job
    // {
    //     public ConvConfig Cofig { get; set; }
    //     public string SourceFormat { get; set; }
    //     public IEnumerable<ConvertApiFileParam> FileParams { get; set; }
    // }

    class Scanner
    {
        public static IEnumerable<ConvertApiFileParam> GetFiles(DirectoryInfo dir)
        {
            var files = dir.GetFiles()
                .Where(f => !string.Equals(f.Name, "config.txt", StringComparison.InvariantCultureIgnoreCase));

            // if (!files.Any()) return new List<ConvertApiFileParam>();

            return files.SelectMany(FileToParam);

            // var fileFormat = FileFormat(files.First());
            //
            // if (result != null)
            // {
            //     fileParams.Concat(result.Files.Select(f => new ConvertApiFileParam(f.Url)));
            //     fileFormat = Path.GetExtension(result.Files.First().FileName).Replace(".", "");
            // }
            //
            // return configs.Select(c => new Job()
            // {
            //     Cofig = c,
            //     SourceFormat = fileFormat,
            //     FileParams = fileParams
            // });
        }

        private static string FileFormat(FileInfo f)
        {
            var format = Path.GetExtension(f.Name).Replace(".", "");
            if (format.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
            {
                using var zip = ZipFile.OpenRead(f.FullName);
                format = Path.GetExtension(zip.Entries.First().Name).Replace(".", "");
            }

            return format;
        }

        private static IEnumerable<ConvertApiFileParam> FileToParam(FileInfo f)
        {
            var format = Path.GetExtension(f.Name).Replace(".", "");
            if (format.Equals("zip", StringComparison.InvariantCultureIgnoreCase))
            {
                using var zip = ZipFile.OpenRead(f.FullName);
                return zip.Entries.Select(f => new ConvertApiFileParam(f.Open(), f.Name));
            }
            
            return new List<ConvertApiFileParam> { new ConvertApiFileParam(f) };
        }
    }
}
