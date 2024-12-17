﻿using System.Collections.Generic;

namespace Template.Logic
{
    public class Response
    {
        public bool Success { get; set; }
        public List<string> SavedFiles { get; set; }
        public string Message { get; set; }
    }
}
