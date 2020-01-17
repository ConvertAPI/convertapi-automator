using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using ConvertApiDotNet;

namespace convertapi_automator
{
    class ConvConfig
    {
        public string DestinationFormat { get; set; }
        public IEnumerable<ConvertApiParam> Params { get; set; } = new List<ConvertApiParam>();
        public bool JoinFiles { get; set; }
    }

    static class Config
    {
        public static ConvConfig GetConvConfig(DirectoryInfo dir)
        {
            var formatConfig = new ConvConfig()
            {
                DestinationFormat = dir.Name.ToLower(),
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

                    return false;
                });

                formatConfig.Params = kvList.Select(kv => new ConvertApiParam(kv.First(), kv.Last())).ToList();
                formatConfig.Params.ToList().RemoveAll(p => p == null);
            }
            catch (FileNotFoundException e) { }

            return formatConfig;
        }
    }
}
