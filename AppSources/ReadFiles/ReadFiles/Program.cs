﻿using System.Text.Json;
using ReadFiles.Logic;

namespace ReadFiles
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

            string[] jsonFiles = Directory.GetFiles(requestPath, "*.json");

            foreach (var file in jsonFiles)
            {
                try
                {
                    string content = File.ReadAllText(file);
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    Request request = JsonSerializer.Deserialize<Request>(content, options);

                    // Process request
                    Response response = Processor.ProcessRequest(request);

                    // Write response
                    string responseContent = JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true });
                    string responseFileName = Path.Combine(responsePath, $"response_{Path.GetFileName(file)}");
                    File.WriteAllText(responseFileName, responseContent);
                }
                catch (Exception ex)
                {
                    // Write error
                    string errorFileName = Path.Combine(errorPath, $"error_{Path.GetFileName(file)}");
                    File.WriteAllText(errorFileName, ex.Message);
                }
                finally
                {
                    File.Delete(file);
                }
            }
        }
    }
}
