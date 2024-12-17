﻿using System.Collections.Generic;

namespace Template.Logic
{
    public class FileData
    {
        public string Path { get; set; }
        public string Content { get; set; }
    }

    public class Request
    {
        public List<FileData> Files { get; set; }
    }
}
