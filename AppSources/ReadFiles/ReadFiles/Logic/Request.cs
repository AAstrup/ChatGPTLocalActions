namespace ReadFiles.Logic
{
    public class Request
    {
        public string? DirectoryPathForListingFiles { get; set; }
        public bool ListingFilesIncludesSubDirectories { get; set; } = false;
        public List<string>? FilePathsForContent { get; set; }
    }
}
