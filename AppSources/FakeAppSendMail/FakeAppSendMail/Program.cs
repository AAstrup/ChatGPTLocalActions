using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FakeAppSendMail
{
    class Program
    {
        static void Main()
        {
            //string requestPath = path ?? "requests";
            //string responsePath = Environment.GetEnvironmentVariable("APP_RESPONSES_PATH") ?? "responses";
            //string errorPath = Environment.GetEnvironmentVariable("APP_ERRORS_PATH") ?? "errors";
            //string formatsPath = Environment.GetEnvironmentVariable("APP_FORMATS_PATH") ?? "formats";

            var path = "C:\\Users\\alexa\\Documents\\AIBrowserApps\\Server\\Apps\\FakeAppSendMail\\app\\";
            string requestPath = path + "requests";
            string responsePath = path + "responses";
            string errorPath = path + "errors";
            string formatsPath = path + "formats";

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
            // Simulate sending an email by creating a response

            // Get recipient name or email
            string recipient = request.UserNameInOutlook ?? request.OutlookEmail;

            if (string.IsNullOrEmpty(recipient))
            {
                throw new ArgumentException("Both UserNameInOutlook and OutlookEmail are null or empty.");
            }

            // Create a simulated email response
            return new Response
            {
                RecieptEmail = request.OutlookEmail ?? request.UserNameInOutlook + "@example.com",
                MailTitle = $"Email to {recipient}",
                MailBody = $"Hello {recipient},\n\nThis is a test email.\n\nRegards,\nFakeAppSendMail"
            };
        }

        static void WriteExampleFormats(string formatsPath)
        {
            // Write example input formats

            // Example Request with UserNameInOutlook
            var exampleRequest1 = new Request { UserNameInOutlook = "JohnDoe" };
            File.WriteAllText(Path.Combine(formatsPath, "request_format_example_1.json"),
                JsonSerializer.Serialize(exampleRequest1, new JsonSerializerOptions { WriteIndented = true }));

            // Example Request with OutlookEmail
            var exampleRequest2 = new Request { OutlookEmail = "john.doe@example.com" };
            File.WriteAllText(Path.Combine(formatsPath, "request_format_example_2.json"),
                JsonSerializer.Serialize(exampleRequest2, new JsonSerializerOptions { WriteIndented = true }));

            // Write example output format

            // Example Response
            var exampleResponse = new Response
            {
                RecieptEmail = "john.doe@example.com",
                MailTitle = "Email to JohnDoe",
                MailBody = "Hello JohnDoe,\n\nThis is a test email.\n\nRegards,\nFakeAppSendMail"
            };
            File.WriteAllText(Path.Combine(formatsPath, "response_format_example.json"),
                JsonSerializer.Serialize(exampleResponse, new JsonSerializerOptions { WriteIndented = true }));
        }
    }
}
