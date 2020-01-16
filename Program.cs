using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ConvertApiDotNet;
using ConvertApiDotNet.Model;

namespace convertapi_automator
{
    class Program
    {
        private static ConvertApi convertApi = new ConvertApi("");

        static void Main(string[] args)
        {
            var dir = new DirectoryInfo(@"c:\Projects\_temp");
            ConvertDir(dir);
            Console.Read();
        }

        static void ConvertDir(DirectoryInfo dir, ConvertApiResponse response = null)
        {
            Scanner.GetJobs(dir).ToList().ForEach(j =>
            {
                if (!j.FileParams.Any()) return;

                if (j.Cofig.JoinFiles)
                {
                    var convertParams = new List<ConvertApiBaseParam>();
                    convertParams.AddRange(j.Cofig.Params);
                    convertParams.AddRange(j.FileParams);

                    convertApi.ConvertAsync(j.SourceFormat, j.Cofig.Format, convertParams)
                        .ContinueWith(r =>
                        {
                            if (j.Cofig.ResultDir.GetDirectories().Any())
                            {
                                var ff = new ConvertApiFileParam("");
                                ConvertDir(j.Cofig.ResultDir, r.Result);
                            }
                            else
                            {
                                r.Result.SaveFilesAsync(j.Cofig.ResultDir.FullName).Wait();
                            }
                        });
                }
                else
                {
                    
                    var conversions = j.FileParams.Select(p =>
                    {
                        var convertParams = new List<ConvertApiBaseParam>();
                        convertParams.AddRange(j.Cofig.Params);
                        convertParams.Add(p);
                        
                        return convertApi.ConvertAsync(j.SourceFormat, j.Cofig.Format, convertParams)
                            .ContinueWith(r =>
                            {
                                if (!j.Cofig.ResultDir.GetDirectories().Any())
                                    r.Result.SaveFilesAsync(j.Cofig.ResultDir.FullName).Wait();
                            });
                    });


                }
            });
        }
    }
}
