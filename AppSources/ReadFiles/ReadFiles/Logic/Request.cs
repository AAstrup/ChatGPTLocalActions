using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ReadFiles.Logic
{
    public enum DirectoryListingMode
    {
        TopDirectoryOnly,
        AllDirectories
    }

    public class Request
    {
        public string? DirectoryPathForListingFiles { get; set; }
        public DirectoryListingMode DirectoryListingMode { get; set; } = DirectoryListingMode.TopDirectoryOnly;
        public List<string>? FilePathsForContent { get; set; }
    }
}


