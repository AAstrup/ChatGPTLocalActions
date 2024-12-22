using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ReadFiles.Logic
{
    public class Response
    {
        public List<PathItem>? ListedPaths { get; set; }
        public Dictionary<string, string>? FileContents { get; set; }
    }

    public class PathItem
    {
        public string FullPath { get; set; } = string.Empty;
        public string? FileExtension { get; set; }  // Will be null for folders
        public bool IsFolder { get; set; }         // Explicitly indicates folder
    }
}
