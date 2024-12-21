using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RunCommand.Logic
{
    public class Request
    {
        public string Directory { get; set; }
        public string Command { get; set; }
        public bool KeepOpen { get; set; }
    }
}
