using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace WinConfig
{
    class Config
    {
        public const string ServiceName = "convertapi-automator";
        public FileInfo ExeFile { get; set; }
        public string Secret { get; set; }
        public List<DirectoryInfo> Dirs { get; set; } = new List<DirectoryInfo>();
        public int Level { get; set; } = 0;
        public int Concurrency { get; set; } = 10;
        public bool Autostart { get; set; } = true;
        public bool Active { get; set; }
        public string AutostartStr() => Autostart ? "auto" : "demand";

        public Config()
        {
        }

        public Config(IEnumerable<IEnumerable<string>> args)
        {
            foreach (var a in args) {
                switch (a.First())
                {
                    case "secret":
                        this.Secret = a.Last();
                        break;
                    case "dir":
                        this.Dirs.Add(new DirectoryInfo(a.Last().Replace("'", "")));
                        break;
                    case "level":
                        this.Level = int.Parse(a.Last());
                        break;
                    case "concurrency":
                        this.Concurrency = int.Parse(a.Last());
                        break;
                }

            }
        }

        public string Cmd()
        {
            var dirs = String.Join(" ", Dirs.Select(d => $"--dir='{d.FullName}'"));
            return $"{ExeFile} --secret={Secret} --level={Level} --concurrency={Concurrency} {dirs}";
        }

    }
}
