using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MissingWorklogs
{
    public class Request
    {
        public string UserName { get; set; }
        public int? WeekNumber { get; set; }
        public string MonthName { get; set; }
    }
}
