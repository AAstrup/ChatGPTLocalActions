using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Template.Logic
{
    public static class Processor
    {
        public static Task<Response> ProcessRequest(Request request)
        {
            var response = new Response
            {
                SavedFiles = new List<string>(),
                Success = true,
                Message = "Files saved successfully"
            };

            try
            {
                foreach (var file in request.Files)
                {
                    if (string.IsNullOrEmpty(file.Path) || file.Content == null)
                    {
                        response.Success = false;
                        response.Message = "Invalid file data";
                        return Task.FromResult(response);
                    }

                    // Ensure the directory exists
                    var directory = Path.GetDirectoryName(file.Path);
                    if (!string.IsNullOrEmpty(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }

                    // Write file content
                    File.WriteAllText(file.Path, file.Content);
                    response.SavedFiles.Add(file.Path);
                }
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.Message = $"Error saving files: {ex.Message}";
            }

            return Task.FromResult(response);
        }
    }
}
