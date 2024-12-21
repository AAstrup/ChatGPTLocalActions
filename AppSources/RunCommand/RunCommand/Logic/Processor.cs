using System;
using System.Diagnostics;
using System.Text;

namespace RunCommand.Logic
{
    public static class Processor
    {
        public static async Task<Response> ProcessRequest(Request request)
        {
            if (request == null || string.IsNullOrEmpty(request.Directory) || string.IsNullOrEmpty(request.Command))
            {
                throw new ArgumentException("Invalid request parameters.");
            }

            var capturedOutput = new StringBuilder();

            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = request.Directory,
            };

            using var process = new Process { StartInfo = psi };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            process.OutputDataReceived += (s, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    Console.WriteLine(e.Data);
                    capturedOutput.AppendLine(e.Data);
                }
            };

            process.ErrorDataReceived += (s, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    Console.WriteLine("ERROR: " + e.Data);
                    capturedOutput.AppendLine("ERROR: " + e.Data);
                }
            };
            await process.StandardInput.WriteLineAsync(request.Command);
            process.StandardInput.Close();

            if(request.KeepOpen)
            {
                // Wait briefly for any final output/errors
                await Task.Delay(2000);
            }
            else
            {
                process.WaitForExit();
            }

            Console.WriteLine("COMMAND COMPLETE:\n" + capturedOutput.ToString());

            return new Response()
            {
                TerminalOutput = capturedOutput.ToString()
            };
        }
    }
}
