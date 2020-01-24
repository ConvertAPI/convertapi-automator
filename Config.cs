using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ConvertApiDotNet;

namespace convertapi_automator
{
    class ConvConfig
    {
        public DirectoryInfo Directory { get; set; }
        public string DestinationFormat { get; set; }
        public IEnumerable<ConvertApiParam> Params { get; set; } = new List<ConvertApiParam>();
        public bool JoinFiles { get; set; }
        public bool SaveIntermediate { get; set; }
    }

    internal static class Config
    {
        public static ConvConfig GetConvConfig(DirectoryInfo dir)
        {
            var formatConfig = new ConvConfig()
            {
                Directory = dir,
                DestinationFormat = dir.Name.ToLower()
            };

            try
            {
                var confFilePath = Path.Join(dir.FullName, "config.txt");
                var kvList = File.ReadAllLines(confFilePath).ToList().Select(l =>
                {
                    var kv = l.Trim().Split("=").Select(s => s.Trim());
                    return kv.Count() == 2 ? kv : null;
                }).ToList();

                kvList.RemoveAll(kv =>
                {
                    if (kv.First().StartsWith("JoinFiles", StringComparison.InvariantCultureIgnoreCase))
                    {
                        formatConfig.JoinFiles = kv.Last().Equals("true", StringComparison.CurrentCultureIgnoreCase);
                        return true;
                    }

                    if (kv.First().StartsWith("SaveIntermediate", StringComparison.InvariantCultureIgnoreCase))
                    {
                        formatConfig.SaveIntermediate = kv.Last().Equals("true", StringComparison.CurrentCultureIgnoreCase);
                        return true;
                    }

                    return false;
                });

                formatConfig.Params = kvList.Select(kv => new ConvertApiParam(kv.First(), kv.Last())).ToList();
                formatConfig.Params.ToList().RemoveAll(p => p == null);
            }
            catch (FileNotFoundException) { }

            return formatConfig;
        }
    }
}
