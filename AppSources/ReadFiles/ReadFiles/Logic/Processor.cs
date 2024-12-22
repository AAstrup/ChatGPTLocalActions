using System.IO;

namespace ReadFiles.Logic
{
    public static class Processor
    {
        public static Response ProcessRequest(Request request)
        {
            var result = new Response();

            if (!string.IsNullOrWhiteSpace(request.DirectoryPathForListingFiles))
            {
                var searchOption = request.ListingFilesIncludesSubDirectories
                    ? SearchOption.AllDirectories
                    : SearchOption.TopDirectoryOnly;

                var directories = Directory.GetDirectories(request.DirectoryPathForListingFiles, "*", searchOption);
                var files = Directory.GetFiles(request.DirectoryPathForListingFiles, "*", searchOption);

                var listedPaths = new List<PathItem>();

                foreach (var dir in directories)
                {
                    listedPaths.Add(new PathItem
                    {
                        FullPath = dir,
                        FileExtension = null,
                        IsFolder = true
                    });
                }

                foreach (var file in files)
                {
                    listedPaths.Add(new PathItem
                    {
                        FullPath = file,
                        FileExtension = Path.GetExtension(file),
                        IsFolder = false
                    });
                }

                result.ListedPaths = listedPaths;
            }

            if (request.FilePathsForContent?.Any() == true)
            {
                result.FileContents = new Dictionary<string, string>();
                foreach (var filePath in request.FilePathsForContent)
                {
                    result.FileContents[filePath] = File.ReadAllText(filePath);
                }
            }

            return result;
        }
    }
}
