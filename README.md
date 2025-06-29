# Gemini OCR Processor

A powerful OCR (Optical Character Recognition) tool that converts PDF documents to text using Google's Gemini 2.0 Flash AI model. This project specializes in processing complex documents with mixed languages (Arabic and English), tables, and structured content.

## Features

- 🔄 **PDF to Image Conversion**: Automatically converts PDF pages to high-resolution PNG images
- 🤖 **AI-Powered OCR**: Uses Google Gemini 2.0 Flash for accurate text extraction
- 🌍 **Multi-Language Support**: Excellent support for Arabic and English text
- 📊 **Table Recognition**: Preserves table structures using markdown format
- 📄 **Batch Processing**: Processes one image at a time for optimal accuracy
- 🔧 **Error Handling**: Robust error handling with detailed logging
- 📝 **Structured Output**: Maintains document formatting and structure

## Prerequisites

Before running this project, ensure you have the following installed:

### System Dependencies

- **Node.js** (v16 or higher)
- **GraphicsMagick**: Required for PDF to image conversion
- **Ghostscript**: Required for PDF processing

#### macOS Installation

```bash
# Install GraphicsMagick and Ghostscript
brew install graphicsmagick ghostscript
```

#### Ubuntu/Debian Installation

```bash
# Install GraphicsMagick and Ghostscript
sudo apt-get update
sudo apt-get install graphicsmagick ghostscript
```

#### Windows Installation

- Download and install GraphicsMagick from: http://www.graphicsmagick.org/download.html
- Download and install Ghostscript from: https://www.ghostscript.com/download/gsdnld.html

### Google API Key

You'll need a Google AI API key to use the Gemini model:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for configuration

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd gemini-ocr-processor
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**
   Create a `.env` file in the root directory:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

4. **Build the project**

```bash
npm run build
```

## Usage

### Basic Usage

1. **Place your PDF files** in the `input_files` directory
2. **Run the OCR processor**:

```bash
npm start
```

3. **Check results** in the `output_files` directory

### File Structure

```
gemini-ocr-processor/
├── input_files/          # Place your PDF files here
├── output_files/          # OCR results will be saved here
├── src/
│   ├── ocrProcessor.ts    # Main OCR processing logic
│   └── run.ts            # Entry point
├── dist/                 # Compiled JavaScript files
├── .env                  # Environment variables
└── package.json
```

### Development Mode

For development with auto-compilation:

```bash
npm run dev
```

## Configuration

### Batch Size

The processor is configured to process **1 image at a time** for optimal accuracy. This can be modified in `src/ocrProcessor.ts`:

```typescript
const batches = batchImages(imagePaths, 1); // Change 1 to desired batch size
```

### Image Quality

PDF to image conversion uses 300 DPI by default. You can modify this in the `convertPdfToImages` function:

```typescript
density: 300, // Change to desired DPI
```

## Output Format

The OCR processor generates:

- **Text files** (`.txt`) with extracted content
- **Page markers** showing which content came from which page
- **Structured formatting** preserving tables and layouts
- **Error markers** for pages that couldn't be processed

Example output structure:

```
----PAGE 1-----
[Content from page 1]

----PAGE 2-----
[Content from page 2]
```

## Supported File Types

### Input

- PDF files (`.pdf`)
- Image files (`.jpg`, `.jpeg`, `.png`, `.webp`)

### Output

- Plain text files (`.txt`)

## Error Handling

The processor includes comprehensive error handling:

- **Rate limiting protection** with delays between API calls
- **Individual page error isolation** - one failed page won't stop the entire process
- **Detailed error logging** with specific error types
- **Automatic retry logic** for transient failures

## Troubleshooting

### Common Issues

1. **"No images generated" error**

   - Ensure GraphicsMagick and Ghostscript are installed
   - Check PDF file permissions and format

2. **API quota exceeded**

   - Check your Google AI API usage limits
   - Increase delays between requests if needed

3. **Out of memory errors**

   - Reduce batch size to 1 (already default)
   - Process smaller PDF files

4. **Permission denied errors**
   - Check file permissions in input/output directories
   - Ensure the process has write access to output_files

### Debug Mode

Temporary images are kept in `output_files/temp_images_*` directories for debugging purposes.

## Performance

- **Processing Speed**: ~1-2 seconds per page (depending on complexity)
- **Memory Usage**: Optimized for large documents with batch processing
- **API Limits**: Respects Google AI API rate limits with built-in delays

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Advanced Configuration

### Custom OCR Instructions

You can modify the OCR instructions in `src/ocrProcessor.ts` to customize text extraction behavior:

```typescript
const prompt = `
  Extract all text, maintaining document structure
  // Add your custom instructions here
`;
```

### Processing Large Documents

For very large PDFs (100+ pages):

1. Consider splitting the PDF into smaller chunks
2. Monitor memory usage during processing
3. Increase timeout values if needed

### API Rate Limiting

The default configuration includes 1-second delays between requests. For higher throughput:

- Upgrade your Google AI API plan
- Adjust delay timing in the code
- Monitor your API quota usage

## Examples

### Processing a Simple PDF

```bash
# Place your PDF in input_files/
cp document.pdf input_files/

# Run OCR
npm start

# Check results
cat output_files/document.txt
```

### Processing Multiple PDFs

The processor automatically handles all PDF files in the `input_files` directory:

```bash
# Add multiple PDFs
cp *.pdf input_files/

# Process all files
npm start
```

### Sample Output

```
----PAGE 1-----
# Document Title
This is the content from page 1...

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

----PAGE 2-----
## Section Header
Content from page 2 continues here...
```

## Technical Details

### Architecture

- **TypeScript**: Strongly typed codebase for reliability
- **Modular Design**: Separate concerns for PDF conversion, OCR, and file handling
- **Async Processing**: Non-blocking operations for better performance
- **Error Isolation**: Individual page failures don't affect the entire document

### Dependencies

- `@google/generative-ai`: Google Gemini AI integration
- `pdf2pic`: PDF to image conversion
- `sharp`: Image processing and optimization
- `dotenv`: Environment variable management

### Performance Optimizations

- Numeric sorting for correct page order
- Memory-efficient image processing
- Batch processing with configurable sizes
- Automatic cleanup of temporary files

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the error logs in the console output
3. Ensure all prerequisites are properly installed
4. Verify your Google AI API key is valid and has sufficient quota
