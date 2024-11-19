using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MissingWorklogs
{
    class Program
    {
        static void Main()
        {
            string requestPath = Environment.GetEnvironmentVariable("APP_REQUESTS_PATH") ?? "requests";
            string responsePath = Environment.GetEnvironmentVariable("APP_RESPONSES_PATH") ?? "responses";
            string errorPath = Environment.GetEnvironmentVariable("APP_ERRORS_PATH") ?? "errors";
            string formatsPath = Environment.GetEnvironmentVariable("APP_FORMATS_PATH") ?? "formats";

            // Ensure directories exist
            Directory.CreateDirectory(requestPath);
            Directory.CreateDirectory(responsePath);
            Directory.CreateDirectory(errorPath);
            Directory.CreateDirectory(formatsPath);

            // Write example input/output formats
            WriteExampleFormats(formatsPath);

            string[] jsonFiles = Directory.GetFiles(requestPath, "*.json");

            foreach (var file in jsonFiles)
            {
                try
                {
                    string content = File.ReadAllText(file);
                    Request request = JsonSerializer.Deserialize<Request>(content);

                    // Process request
                    Response response = ProcessRequest(request);

                    // Write response
                    string responseContent = JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true });
                    string responseFileName = Path.Combine(responsePath, $"response_{Path.GetFileName(file)}");
                    File.WriteAllText(responseFileName, responseContent);

                    // Remove processed file
                    File.Delete(file);
                }
                catch (Exception ex)
                {
                    // Write error
                    string errorFileName = Path.Combine(errorPath, $"error_{Path.GetFileName(file)}");
                    File.WriteAllText(errorFileName, ex.Message);
                }
            }
        }

        static Response ProcessRequest(Request request)
        {
            // Dummy logic for calculating missing hours (for demo)
            int hoursPerWeek = 40;
            int loggedHours = new Random().Next(10, 40);  // Simulated hours logged
            int missingHours = hoursPerWeek - loggedHours;

            return new Response
            {
                UserName = request.UserName,
                WeekNumber = request.WeekNumber,
                MonthName = request.MonthName,
                MissingHours = missingHours
            };
        }

        static void WriteExampleFormats(string formatsPath)
        {
            // Input Format 1: By Week
            var exampleRequestWeek = new Request { UserName = "JohnDoe", WeekNumber = 42 };
            File.WriteAllText(Path.Combine(formatsPath, "request_formats_1.json"),
                JsonSerializer.Serialize(exampleRequestWeek, new JsonSerializerOptions { WriteIndented = true }));

            // Input Format 2: By Month
            var exampleRequestMonth = new Request { UserName = "JohnDoe", MonthName = "October" };
            File.WriteAllText(Path.Combine(formatsPath, "request_formats_2.json"),
                JsonSerializer.Serialize(exampleRequestMonth, new JsonSerializerOptions { WriteIndented = true }));

            // Output Format for Week/Month
            var exampleResponse = new Response { UserName = "JohnDoe", WeekNumber = 42, MissingHours = 5 };
            File.WriteAllText(Path.Combine(formatsPath, "response_formats_1.json"),
                JsonSerializer.Serialize(exampleResponse, new JsonSerializerOptions { WriteIndented = true }));
        }
    }
}
